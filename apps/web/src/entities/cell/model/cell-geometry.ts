import type { Bounds } from "./cell";

/**
 * 격자 → 지도 오버레이 기하 공통 정의 (MSG-121 AC 9·10).
 * 순수 데이터/상수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * MSG-263 개정 2(D8): 500m 근사 기하(CELL_SIDE_METERS·cellToBounds)는 마지막 사용처였던
 * 도감 오버레이 제거와 함께 고아 정리됐다 — 격자 기하는 model/grid.ts(100m 균일 격자)가 정본.
 */

/** 위도 1도당 미터 (지구 자오선 기준 근사) — 경도는 위도별 cos 보정을 거친다 */
export const METERS_PER_DEGREE_LAT = 111_320;

/** 지도에 게시할 셀 오버레이 한 칸 — 순수 데이터(id + Bounds), MapCanvas prop 계약 */
export interface CellOverlay {
  id: string;
  bounds: Bounds;
}
