import { distanceMeters } from "../../../entities/cell/model/geo-distance";
import type { RoutePointDto } from "../../../shared/api/sdk";

/**
 * 구간(이웃 지점 쌍) 거리 파생 — 웹 `features/ai-route/model/route-legs.ts`의 **부분 복제본**
 * (MSG-556, 동등성은 route-legs.parity.test.ts). 순수 함수 — 지도 SDK·플랫폼에 의존하지 않는다.
 *
 * [MSG-490 확장점] 구간 거리 소스 — 지금은 직선(하버사인)뿐이다. 웹의 walk-paths 계열
 * (`buildWalkSegments`·`isWithinKoreaRange`·`alignWalkSegments`·`WalkPathInput`·`resolved`)은
 * 그 티켓이 포팅한다. `buildRouteLegs`의 두 번째 인자 자리를 그때 채운다.
 *
 * Hermes 미구현 API 금지 구역 — `[...arr].sort()` 유지 (MSG-427 실기 크래시, oxlint 강제).
 */

/** 구간 거리 계산 입력 — 방문 순서와 좌표만 쓴다 */
export type RouteStopGeo = Pick<RoutePointDto, "order" | "lat" | "lng">;

export interface RouteLeg {
  fromOrder: number;
  toOrder: number;
  /** 구간 거리(m) — 표기 반올림 전 원값 */
  meters: number;
  /** 커넥터 행 문구 */
  label: string;
}

/**
 * 도보 거리 표기 (L4) — 1000m 미만은 10m 반올림 m, 이상은 소수 1자리 km.
 * 반올림을 먼저 하므로 999.6m는 "1000m"가 아니라 "1.0km"다.
 */
export const formatWalkDistance = (meters: number): string => {
  const rounded = Math.round(meters / 10) * 10;
  return rounded < 1000
    ? `도보 약 ${rounded}m`
    : `도보 약 ${(rounded / 1000).toFixed(1)}km`;
};

/** 방문 순서대로 이웃 쌍마다 구간 하나 — 지점이 1개 이하면 구간이 없다 (L4) */
export const buildRouteLegs = (points: RouteStopGeo[]): RouteLeg[] => {
  const ordered = [...points].sort((a, b) => a.order - b.order);
  return ordered.slice(1).map((to, index) => {
    const from = ordered[index];
    const meters = distanceMeters(
      { lat: from.lat, lng: from.lng },
      { lat: to.lat, lng: to.lng },
    );
    return {
      fromOrder: from.order,
      toOrder: to.order,
      meters,
      label: formatWalkDistance(meters),
    };
  });
};
