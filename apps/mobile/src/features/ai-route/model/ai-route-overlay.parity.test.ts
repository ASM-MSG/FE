import { describe, expect, it } from "vitest";
import type { OccupiedGridResponseDto } from "../../../shared/api/sdk";
import { decodeGridIndex } from "../../../entities/cell/model/grid-5179";
import {
  classifyCells,
  toMissionCells,
} from "../../map-home/model/mission-cells";
import { toOccupiedCells } from "../../map-home/model/occupied-grids";
import { ROUTE_POINTS, routePointOf } from "../../../test/route-points";
import { buildAiRouteOverlay } from "./ai-route-overlay";

/**
 * L8: 추천 지점 → 지도 오버레이 파생 규칙이 웹 `route-overlay.ts`와 동치다 (MSG-556).
 * 출력 형태는 다르다 — 웹은 `StyledCellOverlay(corners·color·hatched)`를 만들고 모바일
 * `GridMap`은 `GridCellIndex[]` 3층을 받는다. 그래서 값 복제가 아니라 **파생 규칙**
 * (order 정렬·gridId 중복 제거·active 판정·교집합 빗금)을 대조한다.
 * 웹 원본은 변수 경로 동적 import (map-scale.parity.test.ts 선례).
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/ai-route/model/route-overlay.ts",
  import.meta.url,
).pathname;

interface WebRouteOverlay {
  buildAiRouteOverlay: (
    points: { order: number; lat: number; lng: number; gridId: string }[],
    occupiedGridIds: string[],
    selectedOrder?: number | null,
  ) => {
    routes: {
      path: { lat: number; lng: number }[];
      waypoints: {
        seq: number;
        position: { lat: number; lng: number };
        active?: boolean;
      }[];
    }[];
    cells: { id: string; hatched?: boolean }[];
  };
}

const loadWeb = (): Promise<WebRouteOverlay> => import(WEB_PATH);

const gridOf = (gridId: string): OccupiedGridResponseDto => {
  const { gridX, gridY } = decodeGridIndex(gridId);
  return {
    gridId,
    gridX,
    gridY,
    zoneName: "서면",
    zoneCell: "A-14",
    regionName: "부전제1동",
  };
};

const SHUFFLED = [ROUTE_POINTS[2], ROUTE_POINTS[0], ROUTE_POINTS[1]];
const SAME_GRID = [
  ROUTE_POINTS[0],
  routePointOf(2, { gridId: ROUTE_POINTS[0].gridId }),
  ROUTE_POINTS[2],
];

describe("buildAiRouteOverlay 동등성 — 웹 route-overlay 대조 (L8)", () => {
  it("path가 order 순 좌표이고 waypoints[i].seq === order다 — 응답이 뒤섞여도 웹과 같은 순서", async () => {
    const web = await loadWeb();

    for (const input of [ROUTE_POINTS, SHUFFLED]) {
      const mobile = buildAiRouteOverlay(input, null);
      const [route] = web.buildAiRouteOverlay(input, []).routes;
      expect(mobile.path).toEqual(route.path);
      expect(mobile.waypoints.map((w) => w.seq)).toEqual(
        route.waypoints.map((w) => w.seq),
      );
      expect(mobile.waypoints.map((w) => w.coord)).toEqual(
        route.waypoints.map((w) => w.position),
      );
    }
    expect(
      buildAiRouteOverlay(SHUFFLED, null).waypoints.map((w) => w.seq),
    ).toEqual([1, 2, 3]);
  });

  it("waypoints[i].active === (order === selectedOrder) — 선택 order 전건에서 웹과 같다", async () => {
    const web = await loadWeb();

    for (const selected of [null, 1, 2, 3, 9]) {
      const mobile = buildAiRouteOverlay(ROUTE_POINTS, selected);
      const [route] = web.buildAiRouteOverlay(
        ROUTE_POINTS,
        [],
        selected,
      ).routes;
      expect(mobile.waypoints.map((w) => w.active)).toEqual(
        route.waypoints.map((w) => w.active),
      );
    }
    expect(
      buildAiRouteOverlay(ROUTE_POINTS, 2).waypoints.map((w) => w.active),
    ).toEqual([false, true, false]);
  });

  it("gridIds가 order 순서를 유지하며 gridId 중복을 제거한다 — 웹 cells[].id와 같다", async () => {
    const web = await loadWeb();

    for (const input of [ROUTE_POINTS, SHUFFLED, SAME_GRID]) {
      expect(buildAiRouteOverlay(input, null).gridIds).toEqual(
        web.buildAiRouteOverlay(input, []).cells.map((cell) => cell.id),
      );
    }
    expect(buildAiRouteOverlay(SAME_GRID, null).gridIds).toHaveLength(2);
  });

  it("points가 비면 gridIds·path·waypoints 전부 빈 값이다 — 이전 표시가 걷힌다 (웹 Q10)", async () => {
    const web = await loadWeb();

    expect(web.buildAiRouteOverlay([], ["39064_112221"]).routes).toEqual([]);
    expect(buildAiRouteOverlay([], 1)).toEqual({
      gridIds: [],
      path: [],
      waypoints: [],
    });
  });

  it("교집합 빗금 — classifyCells(toMissionCells(gridIds), occupied).both가 웹 cells[].hatched 집합과 같다", async () => {
    const web = await loadWeb();
    const occupiedIds = [ROUTE_POINTS[1].gridId];
    const occupiedCells = toOccupiedCells(occupiedIds.map(gridOf));

    const { gridIds } = buildAiRouteOverlay(ROUTE_POINTS, null);
    const { both, themeOnly } = classifyCells(
      toMissionCells(gridIds),
      occupiedCells,
    );
    const webCells = web.buildAiRouteOverlay(ROUTE_POINTS, occupiedIds).cells;

    expect(both).toEqual(
      toMissionCells(webCells.filter((c) => c.hatched).map((c) => c.id)),
    );
    expect(themeOnly).toEqual(
      toMissionCells(webCells.filter((c) => !c.hatched).map((c) => c.id)),
    );
    expect(both).toHaveLength(1);
  });
});
