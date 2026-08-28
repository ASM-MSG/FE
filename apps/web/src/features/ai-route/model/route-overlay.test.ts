import { describe, expect, it } from "vitest";
import { palette } from "@fillmap/design-tokens";
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
