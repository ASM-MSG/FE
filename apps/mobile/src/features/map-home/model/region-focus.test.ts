import { describe, expect, it } from "vitest";
import { cellCenterAt } from "../../../entities/cell/model/grid-5179";
import type { RegionExploreResponseDto } from "../../../shared/api/sdk";
import { regionFocusTarget } from "./region-focus";

/** 지역 선택 → 지도 이동 목적지 (MSG-578 A1 번복). 첫 격자 중심 / 미이동 분기 4종 */
const grid = (gridX: number, gridY: number) =>
  ({
    gridId: `${gridX}-${gridY}`,
    gridX,
    gridY,
  }) as RegionExploreResponseDto["grids"][number];
const data = (regionCode: string, grids: RegionExploreResponseDto["grids"]) =>
  ({ regionCode, grids }) as RegionExploreResponseDto;

describe("regionFocusTarget", () => {
  it("선택 지역의 첫 격자(최신순) 중심으로 이동한다", () => {
    expect(
      regionFocusTarget(
        data("2626", [grid(1200, 900), grid(1201, 900)]),
        "2626",
        null,
      ),
    ).toEqual(cellCenterAt({ gridX: 1200, gridY: 900 }));
  });

  it("목록 미도착·빈 목록이면 이동하지 않는다", () => {
    expect(regionFocusTarget(undefined, "2626", null)).toBeNull();
    expect(regionFocusTarget(data("2626", []), "2626", null)).toBeNull();
  });

  it("다른 지역의 목록(regionCode 에코 불일치)이면 이동하지 않는다", () => {
    expect(
      regionFocusTarget(data("2650", [grid(1, 1)]), "2626", null),
    ).toBeNull();
  });

  it("이미 이 지역으로 이동했으면 다시 이동하지 않는다 — 지역당 1회", () => {
    expect(
      regionFocusTarget(data("2626", [grid(1, 1)]), "2626", "2626"),
    ).toBeNull();
    expect(
      regionFocusTarget(data("2626", [grid(1, 1)]), "2626", "2650"),
    ).not.toBeNull();
  });
});
