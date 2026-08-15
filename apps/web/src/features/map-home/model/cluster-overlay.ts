import type { Bounds, LatLng } from "@/entities/cell";
import { GRID_MIN_ZOOM, isGridCellCenterInBusan } from "./grid-overlay";
import type { StyledCellOverlay } from "./theme-overlay";

/**
 * 클러스터 오버레이 파생 (MSG-264).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * zoom < GRID_MIN_ZOOM에서 격자 채움 대신 원형 배지 + 격자 수 마커로 전환한다 —
 * MSG-263 D4("점령 채움은 임계와 무관하게 항상 표시")를 명시적으로 대체한다.
 * 렌더링(naver Marker + HtmlIcon)·클릭 fitBounds는 MapCanvas 경계 안에서 하고, 여기는 데이터만 만든다.
 */

/**
 * 클러스터 윈도 기저 스텝(도 단위) — 구 위경도 격자 스텝(MSG-325)을 로컬 상수로 이전 (MSG-357 A3).
 * 서버 계약이 아니라 화면 그룹핑 창이라 5179화하지 않는다 — 클러스터링 개편은 별도 티켓.
 */
const CLUSTER_WINDOW_BASE_STEP = { lat: 0.0009, lng: 0.00115 };

/** 클러스터 윈도 원점 — 위경도 (0, 0) 스냅 기준 */
export const CLUSTER_WINDOW_ORIGIN: LatLng = { lat: 0, lng: 0 };

/**
 * 클러스터 윈도의 격자 셀 배수 계수 (A1) — 윈도 지상 폭 = 기저 스텝 × 2^(GRID_MIN_ZOOM − zoom) × 계수.
 * 줌 1단 아웃 = 지상 폭 2배이므로 윈도의 픽셀 등가 크기는 줌과 무관하게 일정하다:
 * zoom 16에서 100m ≈ 52px(위도 35°) → 1.75배 ≈ 90px. 마커 최대 지름(tier 3, 44px)의
 * 2배 이상이라 중앙부 클램프와 함께 마커 겹침이 없다 (AC 7).
 * 게이트 상향(15→16, MSG-357 후속) 시 3.5→1.75 반감 — 앵커 이동을 상쇄해 줌별 지상 폭 불변.
 */
export const CLUSTER_WINDOW_CELL_FACTOR = 1.75;

/** 줌별 클러스터 윈도 스텝(도 단위) — 줌 1단 아웃마다 2배 (AC 6) */
export const clusterWindowSteps = (
  zoom: number,
): { lat: number; lng: number } => {
  const scale = CLUSTER_WINDOW_CELL_FACTOR * 2 ** (GRID_MIN_ZOOM - zoom);
  return {
    lat: CLUSTER_WINDOW_BASE_STEP.lat * scale,
    lng: CLUSTER_WINDOW_BASE_STEP.lng * scale,
  };
};

/** 묶인 격자 수 → 배지 크기 3단계 (AC 5, A2 — mock 규모 기준, 실 API 규모에서 재조정 전제) */
export const tierOf = (count: number): 1 | 2 | 3 =>
  count <= 2 ? 1 : count <= 5 ? 2 : 3;

/** 지도에 게시할 클러스터 마커 — 순수 데이터, MapCanvas prop 계약. bounds는 클릭 줌 인 대상(멤버 셀 합집합) */
export interface ClusterMarker {
  id: string;
  position: LatLng;
  count: number;
  tier: 1 | 2 | 3;
  /** 배지 색 (테마 토큰 hex) — 미지정 시 primary (AC 9) */
  color?: string;
  bounds: Bounds;
}

/**
 * 채움 셀 줌 게이트 (AC 1·2, A5 — 전 섹션 공유) — 셸 합성 계층에서 병합된 오버레이 셀에 적용한다.
 * zoom < GRID_MIN_ZOOM이면 점령·무테마 셀을 걷어 클러스터로 넘긴다(기존 계약).
 *
 * MSG-403 AC 7: **칩 대상 셀(테마 색 보유)은 저줌에서도 채움으로 남긴다** — 칩은 축척
 * 500m·1km로 줌아웃한 화면에서 데이터를 보여주는 것이 목적인데, 여기서 걷히면 그 줌에서
 * 축제 타일·코스 라인 주변 격자가 통째로 사라진다(클러스터 배지로는 영역 모양이 안 읽힌다).
 * 색 유무가 판별자인 이유: 점령 셀과 강조 전용 셀만 색이 없다(buildHomeOverlayCells 계약).
 */
export const gateFillCells = (
  cells: StyledCellOverlay[],
  zoom: number,
): StyledCellOverlay[] =>
  zoom >= GRID_MIN_ZOOM
    ? cells
    : cells.filter((cell) => cell.color !== undefined);

const clampTo = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** 마커를 윈도 중앙 1/2 영역에 클램프하는 반경 비율 (AC 7, A1) */
const CLUSTER_CENTER_CLAMP_RATIO = 0.25;

/** 윈도 스냅 묶음 — col·row는 윈도 좌표, members는 묶인 셀과 그 중심 */
interface ClusterWindow {
  col: number;
  row: number;
  members: { cell: StyledCellOverlay; center: LatLng }[];
}

/** 셀 중심 근사 — 꼭짓점 4점 centroid (MSG-357: 기울어진 사각형이라 corners 평균이 중심이다) */
const cellCentroid = (cell: StyledCellOverlay): LatLng => ({
  lat: cell.corners.reduce((s, c) => s + c.lat, 0) / cell.corners.length,
  lng: cell.corners.reduce((s, c) => s + c.lng, 0) / cell.corners.length,
});

/** 멤버 셀 꼭짓점 전체의 위경도 min/max 합집합 — 클릭 줌 인(fitBounds) 대상 */
const cornersUnionBounds = (members: { cell: StyledCellOverlay }[]): Bounds => {
  const corners = members.flatMap(({ cell }) => cell.corners);
  const lats = corners.map((c) => c.lat);
  const lngs = corners.map((c) => c.lng);
  return {
    sw: { lat: Math.min(...lats), lng: Math.min(...lngs) },
    ne: { lat: Math.max(...lats), lng: Math.max(...lngs) },
  };
};

/**
 * 채움 셀 → 그리드 윈도 클러스터 마커 목록 (AC 4·6·7·10·11).
 * - zoom ≥ GRID_MIN_ZOOM이면 빈 배열 — 채움이 표시되는 줌에서는 클러스터가 없다 (AC 1)
 * - 셀 중심(corners centroid)을 윈도(CLUSTER_WINDOW_ORIGIN 기준)에 스냅해 묶는다 — 누락·중복 없는 분할 (AC 4)
 * - 마커 위치 = 멤버 centroid를 윈도 중앙 1/2 영역으로 클램프 — 인접 마커 최소 간격
 *   = 윈도 절반 보장 (AC 7, A1)
 * - 부산 행정경계 밖 center 셀은 집계 제외 (AC 11 — 파생물 입력이 이미 필터본이어도 재보장)
 */
export const buildClusterMarkers = (
  cells: StyledCellOverlay[],
  zoom: number,
): ClusterMarker[] => {
  if (zoom >= GRID_MIN_ZOOM) return [];

  const step = clusterWindowSteps(zoom);
  const origin = CLUSTER_WINDOW_ORIGIN;
  const windows = new Map<string, ClusterWindow>();

  for (const cell of cells) {
    const center = cellCentroid(cell);
    if (!isGridCellCenterInBusan(center)) continue;

    const col = Math.floor((center.lng - origin.lng) / step.lng);
    const row = Math.floor((center.lat - origin.lat) / step.lat);
    const key = `${col}:${row}`;
    const found = windows.get(key);
    if (found) found.members.push({ cell, center });
    else windows.set(key, { col, row, members: [{ cell, center }] });
  }

  return [...windows.values()].map(({ col, row, members }) => {
    const centroid = {
      lat: members.reduce((s, m) => s + m.center.lat, 0) / members.length,
      lng: members.reduce((s, m) => s + m.center.lng, 0) / members.length,
    };
    const windowCenter = {
      lat: origin.lat + (row + 0.5) * step.lat,
      lng: origin.lng + (col + 0.5) * step.lng,
    };
    const color = members[0].cell.color;

    return {
      id: `cluster-${col}:${row}`,
      position: {
        lat: clampTo(
          centroid.lat,
          windowCenter.lat - step.lat * CLUSTER_CENTER_CLAMP_RATIO,
          windowCenter.lat + step.lat * CLUSTER_CENTER_CLAMP_RATIO,
        ),
        lng: clampTo(
          centroid.lng,
          windowCenter.lng - step.lng * CLUSTER_CENTER_CLAMP_RATIO,
          windowCenter.lng + step.lng * CLUSTER_CENTER_CLAMP_RATIO,
        ),
      },
      count: members.length,
      tier: tierOf(members.length),
      ...(color !== undefined && { color }),
      bounds: cornersUnionBounds(members),
    };
  });
};
