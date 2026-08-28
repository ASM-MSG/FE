import { encodeGridId } from "@/entities/cell";
import type { RoutePointDto } from "@/shared/api/generated";

/**
 * AI 경로추천 지점 픽스처 (MSG-488) — 스토어·오버레이 파생·패널 스모크가 공유한다
 * (occupied-grids 선례). 좌표는 MVP 지역 부산 서면 일대.
 */
export const routePointOf = (
  order: number,
  overrides: Partial<RoutePointDto> = {},
): RoutePointDto => {
  const center = {
    lat: 35.1568 + order * 0.0033,
    lng: 129.0594 + order * 0.0027,
  };
  return {
    order,
    name: `서면 지점 ${order}`,
    kind: "PLACE",
    lat: center.lat,
    lng: center.lng,
    gridId: encodeGridId(center),
    zoneName: "서면",
    zoneCell: `A-${order}`,
    regionName: "부산 부산진구",
    reason: `${order}번째로 들르기 좋아요`,
    missionId: null,
    occurrenceId: null,
    ...overrides,
  };
};

/** 순서대로 이어지는 지점 3개 — 결과 상태의 기본 픽스처 */
export const ROUTE_POINTS: RoutePointDto[] = [1, 2, 3].map((order) =>
  routePointOf(order),
);
