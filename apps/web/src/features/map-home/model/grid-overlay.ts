import {
  gridNodeAt,
  viewportGridRange,
  type Bounds,
  type LatLng,
} from "@/entities/cell";
import type { BoundarySegment } from "@/entities/region";
import type { StyledCellOverlay } from "./theme-overlay";

/**
 * 홈 격자 오버레이 파생 (MSG-263 AC 2~7 · MSG-357 EPSG:5179 전환).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * 렌더링(naver Polyline·Polygon)은 MapCanvas 경계 안에서 하고, 여기는 데이터만 만든다.
 *
 * 성능 전략(스펙): 미점령 격자는 셀당 Polygon이 아니라 수평·수직 점선 Polyline 선분으로
 * 파생한다 — 도형 수가 셀 수(열×행)가 아닌 선 수(열+행 × 경계 분절) 규모다 [AC 5].
 * MSG-357: 격자선은 5179 셀 경계(x·y = 100m 배수)의 끝점만 역변환한 기울어진 선분이다 —
 * 한국 범위 횡축 메르카토르는 국소 선형이라 중간점 샘플링 없이 직선 근사로 충분하다(BE 동일).
 */

/**
 * 격자·채움 표시 최소 줌 — 미만이면 격자선과 점령·테마 채움을 모두 숨기고 지역 집계
 * 마커로 전환한다 (MSG-264 — D4 "점령 채움은 임계와 무관하게 항상 표시"를 명시적으로 대체).
 * 채움 게이트는 cluster-overlay(gateFillCells), 집계 마커 파생은 서버 집계 기반
 * region-cluster-overlay 소유 (MSG-410 — FE 로컬 클러스터 산술 대체).
 * 16 = 네이버 축척 100m — 250m(zoom 15)부터는 집계 마커 (MSG-357 후속, 15→16 상향).
 */
export const GRID_MIN_ZOOM = 16;

/** 지도에 게시할 격자선 한 선분 — 순수 데이터(id + 두 끝점), MapCanvas prop 계약 */
export interface GridLineOverlay {
  id: string;
  path: [LatLng, LatLng];
}

/**
 * 선분을 위경도 bbox 안 구간으로 자른다 (Liang-Barsky) — 전부 밖이면 null.
 * 5179 정렬 선분은 위경도 bbox보다 살짝 비어져 나오므로(기울어짐) 뷰포트 컬링을 정확히
 * 지키려면 bbox 절단이 필요하다.
 */
const clampSegmentToBounds = (
  [a, b]: BoundarySegment,
  bounds: Bounds,
): BoundarySegment | null => {
  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;
  let t0 = 0;
  let t1 = 1;
  const constraints: [number, number][] = [
    [-dLat, a.lat - bounds.sw.lat],
    [dLat, bounds.ne.lat - a.lat],
    [-dLng, a.lng - bounds.sw.lng],
    [dLng, bounds.ne.lng - a.lng],
  ];
  for (const [p, q] of constraints) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  const at = (t: number): LatLng => ({
    lat: a.lat + t * dLat,
    lng: a.lng + t * dLng,
  });
  return [at(t0), at(t1)];
};

/**
 * 뷰포트 → 점선 격자선 선분 목록. [AC 2·5·6 · MSG-477 ③ 전국 확장]
 * - 줌 게이트: GRID_MIN_ZOOM 미만이면 빈 배열 — 채움·클러스터 전환 게이트(MSG-264, cluster-overlay)와 임계 공유
 * - 뷰포트 컬링 + 한 화면 버퍼: 드래그 중 빈 영역 노출을 줄이기 위해 각 방향 1화면 여유(R3)
 * - MSG-477: 부산 행정경계 절단(구 MSG-263 AC 3 — bbox 교집합 + clipLineToBoundary)을
 *   제거했다. 서버 격자 인코딩(EPSG:5179)이 전국 좌표계라 격자는 전국에서 그려지고,
 *   성능은 줌 게이트·컬링·선 규모(열+행)가 그대로 지킨다. 해상·국경 밖 노출은 수용된 부작용.
 * - MSG-357: 셀 범위는 꼭짓점 4점 min/max(viewportGridRange) — 2점 변환이면 기울어진
 *   격자의 가장자리 셀이 빠진다. 선분 id는 `{h|v}-{경계 인덱스}`로 5179 경계 좌표
 *   (인덱스×100m)를 드러낸다 (경계 절단 분절이 사라져 분절 접미사도 제거)
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

  const range = viewportGridRange(buffered);
  const lines: GridLineOverlay[] = [];

  const pushClamped = (id: string, segment: BoundarySegment) => {
    const clamped = clampSegmentToBounds(segment, buffered);
    if (clamped) lines.push({ id, path: clamped });
  };

  // 수평선: gridY 경계(y = gridY×100)마다 x 범위 양끝 교점을 역변환한 선분
  for (let gridY = range.minGridY; gridY <= range.maxGridY + 1; gridY++) {
    pushClamped(`h-${gridY}`, [
      gridNodeAt({ gridX: range.minGridX, gridY }),
      gridNodeAt({ gridX: range.maxGridX + 1, gridY }),
    ]);
  }

  // 수직선: gridX 경계(x = gridX×100)마다 y 범위 양끝 교점을 역변환한 선분
  for (let gridX = range.minGridX; gridX <= range.maxGridX + 1; gridX++) {
    pushClamped(`v-${gridX}`, [
      gridNodeAt({ gridX, gridY: range.minGridY }),
      gridNodeAt({ gridX, gridY: range.maxGridY + 1 }),
    ]);
  }

  return lines;
};

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
