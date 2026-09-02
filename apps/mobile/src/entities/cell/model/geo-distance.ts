import type { LatLng } from "./grid";

/**
 * 좌표 간 거리 — 웹 `entities/cell/model/geo-distance.ts`의 `distanceMeters` 복제본
 * (MSG-556, 동등성은 geo-distance.parity.test.ts). 격자 인코딩과 무관한 순수 구면 기하로
 * 지도 SDK/플랫폼에 의존하지 않는다. 웹의 `boundsCenter`는 모바일 소비처가 없어 복제하지 않았다.
 */

const EARTH_RADIUS_METERS = 6_371_000;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** 두 좌표 사이 거리(m) — 하버사인 */
export const distanceMeters = (a: LatLng, b: LatLng): number => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
};
