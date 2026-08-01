import {
  GRID_LAT_STEP,
  GRID_LNG_STEP,
  GRID_ORIGIN,
  cellBoundsAt,
  cellIndexAt,
  type Bounds,
  type LatLng,
} from "@/entities/cell";
import {
  BUSAN_BBOX,
  BUSAN_BOUNDARY,
  clipLineToBoundary,
  pointInPolygon,
} from "@/entities/region";
import type { OccupiedCell, StyledCellOverlay } from "./theme-overlay";

/**
 * 홈 격자 오버레이 파생 (MSG-263 AC 2~7).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * 렌더링(naver Polyline·Polygon)은 MapCanvas 경계 안에서 하고, 여기는 데이터만 만든다.
 *
 * 성능 전략(스펙): 미점령 격자는 셀당 Polygon이 아니라 수평·수직 점선 Polyline 선분으로
 * 파생한다 — 도형 수가 셀 수(열×행)가 아닌 선 수(열+행 × 경계 분절) 규모다 [AC 5].
 */

/**
 * 격자·채움 표시 최소 줌 — 미만이면 격자선과 점령·테마 채움을 모두 숨기고 클러스터 마커로
 * 전환한다 (MSG-264 — D4 "점령 채움은 임계와 무관하게 항상 표시"를 명시적으로 대체).
 * 채움 게이트·클러스터 파생은 cluster-overlay(gateFillCells·buildClusterMarkers) 소유.
 */
export const GRID_MIN_ZOOM = 15;

/** 지도에 게시할 격자선 한 선분 — 순수 데이터(id + 두 끝점), MapCanvas prop 계약 */
export interface GridLineOverlay {
  id: string;
  path: [LatLng, LatLng];
}

/** 두 Bounds의 교집합 — 겹치지 않으면 null */
const intersectBounds = (a: Bounds, b: Bounds): Bounds | null => {
  const sw = {
    lat: Math.max(a.sw.lat, b.sw.lat),
    lng: Math.max(a.sw.lng, b.sw.lng),
  };
  const ne = {
    lat: Math.min(a.ne.lat, b.ne.lat),
    lng: Math.min(a.ne.lng, b.ne.lng),
  };
  return sw.lat < ne.lat && sw.lng < ne.lng ? { sw, ne } : null;
};

/**
 * 뷰포트 → 부산 행정경계로 절단된 점선 격자선 선분 목록. [AC 2·3·5·6]
 * - 줌 게이트: GRID_MIN_ZOOM 미만이면 빈 배열 — 채움·클러스터 전환 게이트(MSG-264, cluster-overlay)와 임계 공유
 * - 뷰포트 컬링 + 한 화면 버퍼: 드래그 중 빈 영역 노출을 줄이기 위해 각 방향 1화면 여유(R3)
 * - 부산 bbox 교집합 밖이면 빈 배열, 경계 절단은 clipLineToBoundary(스캔라인) [D7]
 */
export const buildGridLines = (
  viewport: Bounds,
  zoom: number,
): GridLineOverlay[] => {
  if (zoom < GRID_MIN_ZOOM) return [];

  const latSpan = viewport.ne.lat - viewport.sw.lat;
  const lngSpan = viewport.ne.lng - viewport.sw.lng;
  const buffered: Bounds = {
    sw: { lat: viewport.sw.lat - latSpan, lng: viewport.sw.lng - lngSpan },
    ne: { lat: viewport.ne.lat + latSpan, lng: viewport.ne.lng + lngSpan },
  };

  const region = intersectBounds(buffered, BUSAN_BBOX);
  if (!region) return [];

  const lines: GridLineOverlay[] = [];

  // 수평선: region 위도 범위 안의 격자 위도(row 경계)마다 경계 절단 선분을 만든다
  const rowFrom = Math.ceil((region.sw.lat - GRID_ORIGIN.lat) / GRID_LAT_STEP);
  const rowTo = Math.floor((region.ne.lat - GRID_ORIGIN.lat) / GRID_LAT_STEP);
  for (let row = rowFrom; row <= rowTo; row++) {
    const lat = GRID_ORIGIN.lat + row * GRID_LAT_STEP;
    const segments = clipLineToBoundary(
      { axis: "h", lat, fromLng: region.sw.lng, toLng: region.ne.lng },
      BUSAN_BOUNDARY,
    );
    segments.forEach((path, i) => lines.push({ id: `h-${row}-${i}`, path }));
  }

  // 수직선: region 경도 범위 안의 격자 경도(col 경계)마다 동일
  const colFrom = Math.ceil((region.sw.lng - GRID_ORIGIN.lng) / GRID_LNG_STEP);
  const colTo = Math.floor((region.ne.lng - GRID_ORIGIN.lng) / GRID_LNG_STEP);
  for (let col = colFrom; col <= colTo; col++) {
    const lng = GRID_ORIGIN.lng + col * GRID_LNG_STEP;
    const segments = clipLineToBoundary(
      { axis: "v", lng, fromLat: region.sw.lat, toLat: region.ne.lat },
      BUSAN_BOUNDARY,
    );
    segments.forEach((path, i) => lines.push({ id: `v-${col}-${i}`, path }));
  }

  return lines;
};

/** 좌표가 속한 격자 셀의 중심이 부산 행정경계 내부인지 — 점령·테마 오버레이 대상 판정 [AC 4] */
export const isGridCellCenterInBusan = (point: LatLng): boolean => {
  const { sw, ne } = cellBoundsAt(cellIndexAt(point));
  return pointInPolygon(
    { lat: (sw.lat + ne.lat) / 2, lng: (sw.lng + ne.lng) / 2 },
    BUSAN_BOUNDARY,
  );
};

/**
 * 점령 셀 → 격자 스냅 + 경계 내부 필터된 점령 오버레이 목록. [AC 4·7, D3]
 * bounds는 center가 속한 100m 격자 셀의 bounds이고, occupied 스타일(Figma:
 * 채움 18% + 실선 테두리 40% — 렌더 수치는 MapCanvas)로 표시된다.
 */
export const buildOccupiedGridCells = (
  occupied: OccupiedCell[],
): StyledCellOverlay[] =>
  occupied
    .filter((cell) => isGridCellCenterInBusan(cell.center))
    .map((cell) => ({
      id: cell.gridId,
      bounds: cellBoundsAt(cellIndexAt(cell.center)),
      occupied: true,
    }));

/**
 * 셸 상시 점령 셀 중 섹션 게시 셀과 id가 겹치는 셀을 렌더 대상에서 제외한다. [개정 2 AC 8, R6]
 * 교집합 셀은 섹션(테마) 스타일 쪽으로만 1회 그려진다 — 상시 층·게시 층 이중 렌더 방지.
 */
export const excludeSectionCells = (
  persistent: StyledCellOverlay[],
  sectionCells: { id: string }[],
): StyledCellOverlay[] => {
  const sectionIds = new Set(sectionCells.map((cell) => cell.id));
  return persistent.filter((cell) => !sectionIds.has(cell.id));
};
