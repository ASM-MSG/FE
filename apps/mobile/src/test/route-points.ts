import { encodeGridId } from "../entities/cell/model/grid-5179";
import type { RoutePointDto } from "../shared/api/sdk";

/**
 * AI 경로추천 지점 픽스처 (MSG-556) — 웹 `src/test/route-points.ts` 대응.
 * 스토어·오버레이 parity·mutation 테스트가 공유한다. 좌표는 MVP 지역 부산 서면 일대이고
 * gridId는 모바일 `encodeGridId`(웹 복제본·parity 고정)로 만든다.
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
