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

const MIN_ZOOM = 6;
const MAX_ZOOM = MIN_ZOOM + SCALE_BY_ZOOM.length - 1;

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
