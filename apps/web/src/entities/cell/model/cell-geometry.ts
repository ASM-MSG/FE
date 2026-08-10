import type { CellCorners } from "./grid";

/**
 * 격자 → 지도 오버레이 기하 공통 정의 (MSG-121 AC 9·10).
 * 순수 데이터/상수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * MSG-263 개정 2(D8): 500m 근사 기하(CELL_SIDE_METERS·cellToBounds)는 마지막 사용처였던
 * 도감 오버레이 제거와 함께 고아 정리됐다 — 격자 기하는 model/grid.ts가 정본.
 * MSG-357: 셀 기하가 sw/ne Bounds에서 꼭짓점 4점(corners)으로 바뀌었다 — EPSG:5179 셀은
 * 자오선 수렴으로 위경도 평면에서 기울어져 있어 축평행 Bounds로는 표현할 수 없다.
 */

/** 위도 1도당 미터 (지구 자오선 기준 근사) — 경도는 위도별 cos 보정을 거친다 */
export const METERS_PER_DEGREE_LAT = 111_320;

/** 지도에 게시할 셀 오버레이 한 칸 — 순수 데이터(id + 꼭짓점 4점), MapCanvas prop 계약 */
export interface CellOverlay {
  id: string;
  /** 셀 꼭짓점 — 남서→남동→북동→북서 (grid.ts CellCorners 순서) */
  corners: CellCorners;
}
