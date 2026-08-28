import { distanceMeters } from "@/entities/cell";
import type { RoutePointDto } from "@/shared/api/generated";

/**
 * 구간(이웃 지점 쌍) 거리 파생 (MSG-488 L3).
 * 순수 함수 — 지도 SDK·플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * 이 티켓의 거리는 **이웃 좌표 직선(하버사인)** 근사다. 실보행 경로·거리는 MSG-490이
 * `POST /api/routes/walk-paths`로 교체하며, 직선은 그때 폴백으로 남는다.
 */

/** 구간 거리 계산 입력 — 방문 순서와 좌표만 쓴다 */
type RouteStopGeo = Pick<RoutePointDto, "order" | "lat" | "lng">;

export interface RouteLeg {
  fromOrder: number;
  toOrder: number;
  /** 직선 거리(m) — 표기 반올림 전 원값 */
  meters: number;
  /** 커넥터 행 문구 */
  label: string;
}

/**
 * 도보 거리 표기 (승인 Q6) — 1000m 미만은 10m 반올림 m, 1000m 이상은 소수 1자리 km.
 * 반올림을 먼저 하므로 999.6m는 "1000m"가 아니라 "1.0km"로 넘어간다.
 */
export const formatWalkDistance = (meters: number): string => {
  const rounded = Math.round(meters / 10) * 10;
  return rounded < 1000
    ? `도보 약 ${rounded}m`
    : `도보 약 ${(rounded / 1000).toFixed(1)}km`;
};

/** 방문 순서대로 이웃 쌍마다 구간 하나 — 지점이 1개 이하면 구간이 없다 (L3) */
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
