import type { Bounds, LatLng } from "../../../entities/cell/model/grid";
import type { OriginDto } from "../../../shared/api/sdk";

/**
 * 출발지 자동 판정 (L2) — 웹 `features/ai-route/model/route-origin.ts` 복제본
 * (MSG-559, 동등성은 route-origin.parity.test.ts).
 * 순수 함수 — 지도 SDK도 expo-location도 모른다. 현위치 조회는 `shared/geolocation`
 * 어댑터가, 뷰포트는 화면 로컬 `Viewport` 상태가 공급한다.
 *
 * 토글이 아니다: 현위치가 지금 보이는 지도 범위 안에 있을 때만 출발지를 싣고,
 * 밖이거나 권한 거부·미확보면 조용히 생략한다(기능은 그대로 동작한다 — 웹 D8·§6 A2).
 */

/** 뷰포트 포함 판정 — 경계선 위는 안으로 본다. 2차 발사의 새 bounds 재판정도 이 판정을 쓴다 */
export const isWithinBounds = (coords: LatLng, { sw, ne }: Bounds): boolean =>
  coords.lat >= sw.lat &&
  coords.lat <= ne.lat &&
  coords.lng >= sw.lng &&
  coords.lng <= ne.lng;

export const resolveRouteOrigin = ({
  coords,
  bounds,
}: {
  /** 현위치 — 권한 거부·미확보·측위 전은 null */
  coords: LatLng | null;
  /** 지금 보이는 지도 범위 — 지도 준비 전은 null */
  bounds: Bounds | null;
}): OriginDto | null => {
  if (coords === null || bounds === null) return null;
  if (!isWithinBounds(coords, bounds)) return null;
  return { lat: coords.lat, lng: coords.lng };
};
