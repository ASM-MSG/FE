/**
 * 네이버 지도 zoom(6~21) → 축척 바 거리 표기 (MSG-254 A3).
 * 기존 카카오 level 표를 `zoom ≈ 20 − level` 대응(A1)으로 역순 재배치하고,
 * 카카오에 없던 zoom 20·21 두 단을 보완한 근사 관례 표다 —
 * 고정 폭 바에 zoom당 대표 거리를 라벨링하며, 실측(위도별 m/px) 보정은 실 API 단계 후속.
 * 지도 SDK를 import하지 않는 순수 함수(RN 경계).
 */
const SCALE_BY_ZOOM = [
  "128km",
  "64km",
  "32km",
  "16km",
  "8km",
  "4km",
  "2km",
  "1km",
  "500m",
  "250m",
  "100m",
  "50m",
  "30m",
  "20m",
  "10m",
  "5m",
] as const;

/** 네이버 지도 zoom 유효 범위 (A2) — 축척 표와 줌 클램핑(MapCanvas)이 공유하는 단일 정의 */
export const MIN_ZOOM = 6;
export const MAX_ZOOM = MIN_ZOOM + SCALE_BY_ZOOM.length - 1;

/**
 * 축척 `500m`·`1km` 단의 zoom (MSG-395 AC 19 → MSG-403 AC 5) — 칩이 맞추는 줌.
 * 표에서 직접 찾아 하드코딩(14·13)을 피한다: 축척 표가 재보정되면 이 값도 따라 움직인다.
 */
export const MAP_SCALE_500M_ZOOM = MIN_ZOOM + SCALE_BY_ZOOM.indexOf("500m");
export const MAP_SCALE_1KM_ZOOM = MIN_ZOOM + SCALE_BY_ZOOM.indexOf("1km");
/** 축척 `2km` 단 — "장소 불러오기"가 동작하는 가장 넓은 줌 (MSG-403 후속) */
export const MAP_SCALE_2KM_ZOOM = MIN_ZOOM + SCALE_BY_ZOOM.indexOf("2km");
/** 축척 `4km` 단 — 시 마커 클릭이 들어가는 구 구간 줌 (MSG-410 추정 3) */
export const MAP_SCALE_4KM_ZOOM = MIN_ZOOM + SCALE_BY_ZOOM.indexOf("4km");
/** 축척 `8km` 단 — 집계 unit SIGUNGU/SIDO 경계 (MSG-410 AC 1: 1km~8km=구, 16km~=시) */
export const MAP_SCALE_8KM_ZOOM = MIN_ZOOM + SCALE_BY_ZOOM.indexOf("8km");

/**
 * zoom을 유효 범위로 클램프(비정수는 내림)해 축척 라벨을 반환한다.
 * NaN은 클램프를 전파 통과해 undefined 렌더로 이어지므로 최소 zoom 축척으로 방어한다
 * (±Infinity는 클램프가 경계 값으로 흡수 — 별도 가드 불필요).
 */
export const scaleLabelForZoom = (zoom: number): string => {
  if (Number.isNaN(zoom)) return SCALE_BY_ZOOM[0];
  const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.floor(zoom)));
  return SCALE_BY_ZOOM[clamped - MIN_ZOOM];
};
