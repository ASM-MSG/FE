/**
 * 100m급 격자 — 웹 `apps/web/src/entities/cell/model/grid.ts`의 복제본
 * (MSG-294 D1: 복제 + 동등성 테스트, 공유 패키지 승격 아님).
 * 원점·스텝·함수 결과의 웹 동등성은 grid.parity.test.ts가 웹 원본을 직접 import해
 * 단정한다 — 웹 쪽 변경 시 이 테스트가 깨져 드리프트를 감지한다.
 *
 * MSG-325: 자체 원점(부산 bbox SW)·자체 스텝을 **서버 정본**
 * (`com.msg.fillmap.grid.GridConstants`)으로 교체했다. BE 글로서리("격자 계산 규칙")가
 * FE·BE·모바일이 이 상수를 공유한다고 규정하므로 모바일도 같은 값을 쓴다.
 * 웹이 추가로 가진 encodeGridId·decodeGridBounds는 모바일에 사용처가 생길 때 복제한다.
 *
 * 웹과의 차이는 타입 출처뿐: 웹 cell.ts는 웹 생성 API 타입에 의존하므로
 * `LatLng`·`Bounds`를 여기 로컬로 둔다.
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

/** 남북(위도) 스텝 — 서버 `GRID_LAT_STEP` */
export const GRID_LAT_STEP = 0.0009;

/** 동서(경도) 스텝 — 서버 `GRID_LNG_STEP`. 한국 위도에서 동서 폭이 ≈100m가 되도록 맞춘 값 */
export const GRID_LNG_STEP = 0.00115;

/** 격자 원점 = 적도·본초자오선 — 서버 인코딩이 원점 보정 없이 좌표를 스텝으로 나눈다 */
export const GRID_ORIGIN: LatLng = { lat: 0, lng: 0 };

/** 격자 셀 인덱스 — `col` = 서버 `gridX`(경도 기반), `row` = 서버 `gridY`(위도 기반) */
export interface GridCellIndex {
  col: number;
  row: number;
}

/** 좌표 → 소속 격자 셀 인덱스 (floor 반열림 — sw 변 포함, ne 변 미포함). [AC 1] */
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
