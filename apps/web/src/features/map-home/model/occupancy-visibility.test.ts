import { describe, expect, it } from "vitest";
import { MOCK_OCCUPIED_GRIDS } from "@/test/occupied-grids";
import { toOccupiedOverlays } from "./occupied-grid-overlay";
import { visibleOccupiedCells } from "./occupancy-visibility";

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
