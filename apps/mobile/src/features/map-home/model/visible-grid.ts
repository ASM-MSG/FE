import {
  GRID_LAT_STEP,
  GRID_LNG_STEP,
  GRID_ORIGIN,
  cellBoundsAt,
  type Bounds,
} from "../../../entities/cell/model/grid";

/**
 * 뷰포트 → 표시할 격자 셀 목록 파생 (AC 3).
 * 순수 함수 — 지도 SDK에 의존하지 않는다. 렌더링(NaverMapPolygonOverlay)은
 * grid-map.tsx 경계 안에서 하고, 여기는 데이터만 만든다 (웹 grid-overlay.ts 참조).
 */

/**
 * 격자 표시 최소 줌 — 미만이면 격자를 숨긴다 (웹 GRID_MIN_ZOOM 선례와 동일 임계).
 * 광역 줌 아웃에서 100m 셀이 수천 개로 폭증해 오버레이 렌더가 멈추는 것을 막는다.
 * 줌 값은 네이버 의미 체계(클수록 확대, 6~21)가 정본.
 *
 * MSG-428 승인 Q1 — **15 → 16 상향(드리프트 보수)**. 웹은 MSG-357 후속에서 이미 16으로
 * 올렸는데(축척 250m부터는 집계 마커) 모바일이 그 상향분을 받지 못해 값만 갈라져 있었다.
 * 이 파일 주석이 처음부터 "웹 선례와 동일 임계"를 선언하고 있었으므로 값 쪽이 의도와
 * 어긋난 드리프트다. 16이 아니면 zoom 15에서 격자와 동 단위 클러스터 마커가 동시에
 * 보인다 — 두 층의 상호 배타는 aggregation-unit.parity.test.ts(L3)가 단정한다.
 */
export const GRID_MIN_ZOOM = 16;

/** 지도에 게시할 셀 한 칸 — 순수 데이터(id + Bounds), GridMap prop 계약 */
export interface VisibleCell {
  id: string;
  bounds: Bounds;
}

/**
 * 뷰포트와 실제로 겹치는 셀만, 원점·스텝에 정렬된 경계 좌표로 산출한다. [AC 3]
 * 경계값 처리: 뷰포트 변에 스치기만 하는(겹침 폭 0) 셀은 제외한다 — ceil-1/floor 스냅.
 */
export const buildVisibleCells = (
  viewport: Bounds,
  zoom: number,
): VisibleCell[] => {
  if (zoom < GRID_MIN_ZOOM) return [];

  const colFrom = Math.floor(
    (viewport.sw.lng - GRID_ORIGIN.lng) / GRID_LNG_STEP,
  );
  const colTo =
    Math.ceil((viewport.ne.lng - GRID_ORIGIN.lng) / GRID_LNG_STEP) - 1;
  const rowFrom = Math.floor(
    (viewport.sw.lat - GRID_ORIGIN.lat) / GRID_LAT_STEP,
  );
  const rowTo =
    Math.ceil((viewport.ne.lat - GRID_ORIGIN.lat) / GRID_LAT_STEP) - 1;

  const cells: VisibleCell[] = [];
  for (let row = rowFrom; row <= rowTo; row++) {
    for (let col = colFrom; col <= colTo; col++) {
      cells.push({ id: `${col}:${row}`, bounds: cellBoundsAt({ col, row }) });
    }
  }
  return cells;
};
