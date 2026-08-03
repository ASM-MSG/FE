import type { Bounds, LatLng } from "./cell";
import { METERS_PER_DEGREE_LAT } from "./cell-geometry";

/**
 * 부산 전역 100m × 100m 균일 격자 (MSG-263 AC 1, D1·D2).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * "전 지역 일정한 100m"는 기준 위도(부산 bbox 중심) 고정 경도 스텝으로 근사한다(D1) —
 * 부산 위도 범위(34.985~35.386)에서 동서 실거리 오차 ±1% 미만 (grid.test 판정).
 * 서버 격자 체계가 정해지면 원점·인덱스 스킴을 서버 정의로 교체한다(D2 전제).
 */

/** 격자 한 변 길이(m) — 홈 격자 사양 (MSG-263). 도감의 CELL_SIDE_METERS(500)와 별개 병행 */
export const GRID_CELL_METERS = 100;

/**
 * 격자 원점 = 부산 행정경계 bbox SW 코너 (D2).
 * 값은 entities/region/model/busan-boundary.ts의 BUSAN_BBOX.sw 스냅샷(2026-07-30) —
 * 정합은 busan-boundary.test가 단정한다. entities/region을 import하지 않는 것은
 * 격자 지오메트리를 경계 데이터 모듈과 독립으로 유지하기 위함(단방향 의존).
 */
export const GRID_ORIGIN: LatLng = { lat: 34.98495, lng: 128.79626 };

/** 경도 스텝 고정의 기준 위도 (D1) — 부산 bbox 중심 위도 (busan-boundary 스냅샷 유래) */
export const GRID_REF_LAT = 35.18524;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** 남북(위도) 스텝 — 자오선 근사, 전 지역 동일 */
export const GRID_LAT_STEP = GRID_CELL_METERS / METERS_PER_DEGREE_LAT;

/** 동서(경도) 스텝 — 기준 위도에서 100m가 되도록 고정 (D1: 위도별 가변 아님) */
export const GRID_LNG_STEP =
  GRID_CELL_METERS /
  (METERS_PER_DEGREE_LAT * Math.cos(toRadians(GRID_REF_LAT)));

/** 격자 셀 인덱스 — 원점(GRID_ORIGIN) 기준 동쪽 col·북쪽 row (0부터, 음수 = 원점 남서쪽) */
export interface GridCellIndex {
  col: number;
  row: number;
}

/** 좌표 → 소속 격자 셀 인덱스 (floor 스냅 — sw 변 포함, ne 변 미포함). [AC 1] */
export const cellIndexAt = (point: LatLng): GridCellIndex => ({
  col: Math.floor((point.lng - GRID_ORIGIN.lng) / GRID_LNG_STEP),
  row: Math.floor((point.lat - GRID_ORIGIN.lat) / GRID_LAT_STEP),
});

/** 격자 셀 인덱스 → 셀 Bounds(sw/ne). [AC 1] */
export const cellBoundsAt = (index: GridCellIndex): Bounds => ({
  sw: {
    lat: GRID_ORIGIN.lat + index.row * GRID_LAT_STEP,
    lng: GRID_ORIGIN.lng + index.col * GRID_LNG_STEP,
  },
  ne: {
    lat: GRID_ORIGIN.lat + (index.row + 1) * GRID_LAT_STEP,
    lng: GRID_ORIGIN.lng + (index.col + 1) * GRID_LNG_STEP,
  },
});
