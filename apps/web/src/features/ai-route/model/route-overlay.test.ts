import { describe, expect, it } from "vitest";
import { palette } from "@fillmap/design-tokens";
import type { WalkSegmentDto } from "@/shared/api/generated";
import { ROUTE_POINTS, routePointOf } from "@/test/route-points";
import { AI_ROUTE_OVERLAY_ID, buildAiRouteOverlay } from "./route-overlay";

describe("buildAiRouteOverlay — 지도 게시 오버레이 파생 (L6)", () => {
  it("경로 오버레이 1개에 order 순 직선 path와 번호 경유지를 싣는다 (L6)", () => {
    const { routes } = buildAiRouteOverlay(ROUTE_POINTS, []);

    expect(routes).toHaveLength(1);
    expect(routes[0].id).toBe(AI_ROUTE_OVERLAY_ID);
    expect(routes[0].color).toBe(palette["theme-route"]);
    expect(routes[0].waypoints.map((w) => w.seq)).toEqual([1, 2, 3]);
    expect(routes[0].path).toEqual(
      ROUTE_POINTS.map(({ lat, lng }) => ({ lat, lng })),
    );
  });

  it("응답 순서가 뒤섞여도 order 순으로 잇는다 (L6)", () => {
    const shuffled = [ROUTE_POINTS[2], ROUTE_POINTS[0], ROUTE_POINTS[1]];

    const { routes } = buildAiRouteOverlay(shuffled, []);

    expect(routes[0].waypoints.map((w) => w.seq)).toEqual([1, 2, 3]);
  });

  it("선택된 지점의 경유지 마커만 강조 표시가 켜진다 (L6, S8)", () => {
    const { routes } = buildAiRouteOverlay(ROUTE_POINTS, [], 2);

    expect(routes[0].waypoints.map((w) => w.active === true)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("지점 격자를 중복 없이 경로 색 셀로 만든다 (L6)", () => {
    const sameGrid = [
      ROUTE_POINTS[0],
      routePointOf(2, { gridId: ROUTE_POINTS[0].gridId }),
    ];

    const { cells } = buildAiRouteOverlay(sameGrid, []);

    expect(cells).toHaveLength(1);
    expect(cells[0].id).toBe(ROUTE_POINTS[0].gridId);
    expect(cells[0].color).toBe(palette["theme-route"]);
    expect(cells[0].corners).toHaveLength(4);
  });

  it("내 점령 격자와 겹치는 셀만 빗금이 켜진다 (L6)", () => {
    const { cells } = buildAiRouteOverlay(ROUTE_POINTS, [
      ROUTE_POINTS[1].gridId,
    ]);

    expect(cells.map((cell) => cell.hatched === true)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("지점이 없으면 경로도 셀도 게시하지 않는다 (L6, Q10)", () => {
    expect(buildAiRouteOverlay([], ["39064_112221"])).toEqual({
      routes: [],
      cells: [],
    });
  });
});

/** 서면 일대 보행 좌표열 — 두 지점 사이를 도로 따라 굽어 가는 형태의 근사 */
const walkPath = (from: { lat: number; lng: number }, to: typeof from) => [
  { lat: from.lat, lng: from.lng },
  { lat: from.lat + 0.0005, lng: from.lng + 0.0018 },
  { lat: to.lat, lng: to.lng },
];
const resolvedSegment = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): WalkSegmentDto => ({
  resolved: true,
  path: walkPath(from, to),
  distanceMeters: 604,
});
/** 미해결 세그먼트 — 그 구간만 직선으로 남는다 (사양, §8 오탐 9) */
const UNRESOLVED: WalkSegmentDto = {
  resolved: false,
  path: null,
  distanceMeters: null,
};
const straightPath = ROUTE_POINTS.map(({ lat, lng }) => ({ lat, lng }));

describe("buildAiRouteOverlay — walk-paths 실보행 폴리라인 합성 (L9~L12)", () => {
  it("walk를 주지 않으면 order 순 직선 path 그대로다 (L10, 회귀 고정)", () => {
    const { routes } = buildAiRouteOverlay(ROUTE_POINTS, []);

    expect(routes[0].path).toEqual(straightPath);
  });

  it("전 세그먼트가 미해결이면 path가 order 순 직선과 같다 (L10)", () => {
    const { routes } = buildAiRouteOverlay(ROUTE_POINTS, [], null, {
      segments: [UNRESOLVED, UNRESOLVED],
    });

    expect(routes[0].path).toEqual(straightPath);
  });

  it("resolved 세그먼트의 보행 좌표열을 이어 붙이고 접점 중복 좌표는 하나로 합친다 (L9, Q8)", () => {
    const first = resolvedSegment(ROUTE_POINTS[0], ROUTE_POINTS[1]);
    const second = resolvedSegment(ROUTE_POINTS[1], ROUTE_POINTS[2]);

    const { routes } = buildAiRouteOverlay(ROUTE_POINTS, [], null, {
      segments: [first, second],
    });

    expect(routes[0].path).toEqual([
      ...walkPath(ROUTE_POINTS[0], ROUTE_POINTS[1]),
      ...walkPath(ROUTE_POINTS[1], ROUTE_POINTS[2]).slice(1),
    ]);
  });

  it("부분 해결이면 해결 구간은 보행 좌표열, 미해결 구간은 두 끝점 직선으로 한 줄에 이어진다 (L9, S3)", () => {
    const { routes } = buildAiRouteOverlay(ROUTE_POINTS, [], null, {
      segments: [resolvedSegment(ROUTE_POINTS[0], ROUTE_POINTS[1]), UNRESOLVED],
    });

    expect(routes[0].path).toEqual([
      ...walkPath(ROUTE_POINTS[0], ROUTE_POINTS[1]),
      { lat: ROUTE_POINTS[2].lat, lng: ROUTE_POINTS[2].lng },
    ]);
  });

  it("응답 세그먼트 개수가 요청 개수와 다르면 walk 결과를 통째로 버리고 직선으로 되돌린다 (L11, Q9)", () => {
    const { routes } = buildAiRouteOverlay(ROUTE_POINTS, [], null, {
      segments: [resolvedSegment(ROUTE_POINTS[0], ROUTE_POINTS[1])],
    });

    expect(routes[0].path).toEqual(straightPath);
  });

  it("부분 해결이어도 번호 경유지와 격자 셀은 MSG-488과 동일하다 (L12)", () => {
    const base = buildAiRouteOverlay(ROUTE_POINTS, [ROUTE_POINTS[1].gridId], 2);

    const withWalk = buildAiRouteOverlay(
      ROUTE_POINTS,
      [ROUTE_POINTS[1].gridId],
      2,
      {
        segments: [
          resolvedSegment(ROUTE_POINTS[0], ROUTE_POINTS[1]),
          UNRESOLVED,
        ],
      },
    );

    expect(withWalk.routes[0].waypoints).toEqual(base.routes[0].waypoints);
    expect(withWalk.cells).toEqual(base.cells);
  });
});
