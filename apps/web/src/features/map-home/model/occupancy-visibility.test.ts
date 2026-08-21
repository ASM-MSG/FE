import { describe, expect, it } from "vitest";
import { MOCK_OCCUPIED_GRIDS } from "@/test/occupied-grids";
import { toOccupiedOverlays } from "./occupied-grid-overlay";
import { GRID_MIN_ZOOM } from "./grid-overlay";
import { MIN_ZOOM } from "./map-scale";
import {
  missionCellsVisible,
  visibleOccupiedCells,
} from "./occupancy-visibility";

/** 셸 상시 층과 동일 입력 경로의 점령 셀 (MSG-263 D9) */
const PERSISTENT = toOccupiedOverlays(MOCK_OCCUPIED_GRIDS);

describe("visibleOccupiedCells — 칩 활성 중 점령 층 억제 (AC 1)", () => {
  it("활성 칩이 없으면 점령 셀이 그대로 표시된다 (AC 1)", () => {
    expect(visibleOccupiedCells(PERSISTENT, null)).toEqual(PERSISTENT);
  });

  it("핫구역 칩이 켜져 있으면 점령 셀이 표시 대상에서 빠진다 (AC 1)", () => {
    expect(visibleOccupiedCells(PERSISTENT, "hot")).toEqual([]);
  });

  it("축제·팝업·경로추천 칩에서도 점령 셀이 빠진다 — 칩 대상만 남긴다 (AC 1)", () => {
    for (const chip of ["festival", "popup", "route"] as const) {
      expect(visibleOccupiedCells(PERSISTENT, chip)).toEqual([]);
    }
  });

  it("칩이 없을 때는 입력 배열 참조를 그대로 돌려준다 — 메모 무효화 방지 (AC 1)", () => {
    expect(visibleOccupiedCells(PERSISTENT, null)).toBe(PERSISTENT);
  });
});

describe("missionCellsVisible — 축제·팝업 격자의 저줌 게이트 (MSG-451 AC 2·3)", () => {
  it("축척 100m 이내(개별 격자 구간)에서는 목록 상태에서도 격자를 그린다 (AC 3)", () => {
    expect(
      missionCellsVisible({ zoom: GRID_MIN_ZOOM, hasDetailTarget: false }),
    ).toBe(true);
  });

  it("축척 250m 이상으로 줌아웃하면 목록 상태의 격자는 그리지 않는다 — 집계 마커가 대신한다 (AC 2)", () => {
    expect(
      missionCellsVisible({ zoom: GRID_MIN_ZOOM - 1, hasDetailTarget: false }),
    ).toBe(false);
  });

  it("상세를 연 대상의 격자는 저줌에서도 계속 그린다 — 이동 직후 화면이 비지 않게 (추정 3)", () => {
    expect(missionCellsVisible({ zoom: MIN_ZOOM, hasDetailTarget: true })).toBe(
      true,
    );
  });
});
