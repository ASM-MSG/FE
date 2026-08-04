/**
 * 부산 전역 100m × 100m 균일 격자 — 웹 `apps/web/src/entities/cell/model/grid.ts`의
 * 복제본 (MSG-294 D1: 복제 + 동등성 테스트, 공유 패키지 승격 아님).
 * 원점·스텝·함수 결과의 웹 동등성은 grid.parity.test.ts가 웹 원본을 직접 import해
 * 단정한다 — 웹 쪽 변경 시 이 테스트가 깨져 드리프트를 감지한다.
 *
 * 웹과의 차이는 타입 출처뿐: 웹 cell.ts는 웹 생성 API 타입에 의존하므로
 * `LatLng`·`Bounds`와 METERS_PER_DEGREE_LAT(웹 cell-geometry.ts)를 여기 로컬로 둔다.
 */

/** 위경도 좌표 (플랫폼 중립) — 프론트 도메인은 `lng`를 쓴다 */
export interface LatLng {
  lat: number;
  lng: number;
}

/** 지도 뷰포트 경계 — 남서(sw)/북동(ne) 꼭짓점 좌표 */
export interface Bounds {
  sw: LatLng;
  ne: LatLng;
}

/** 위도 1도당 미터 (지구 자오선 기준 근사) — 경도는 위도별 cos 보정을 거친다 */
export const METERS_PER_DEGREE_LAT = 111_320;

/** 격자 한 변 길이(m) — 홈 격자 사양 (MSG-263) */
export const GRID_CELL_METERS = 100;

/** 격자 원점 = 부산 행정경계 bbox SW 코너 (웹 D2 스냅샷과 동일 값) */
export const GRID_ORIGIN: LatLng = { lat: 34.98495, lng: 128.79626 };

/** 경도 스텝 고정의 기준 위도 — 부산 bbox 중심 위도 */
export const GRID_REF_LAT = 35.18524;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** 남북(위도) 스텝 — 자오선 근사, 전 지역 동일 */
export const GRID_LAT_STEP = GRID_CELL_METERS / METERS_PER_DEGREE_LAT;

/** 동서(경도) 스텝 — 기준 위도에서 100m가 되도록 고정 (위도별 가변 아님) */
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
