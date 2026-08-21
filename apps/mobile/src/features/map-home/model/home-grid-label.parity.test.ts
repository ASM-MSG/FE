import { describe, expect, it } from "vitest";
import { gridDisplayName } from "./home-grid-label";

/**
 * C4: 격자명이 `zoneName zoneCell` > `regionName` > `gridId` 순으로 정해진다 (MSG-427) —
 * 웹 `features/map-home/model/grid-label.ts` 원본 동등.
 * 파일명이 웹과 다른 이유: 모바일에 `features/dex/model/grid-label.ts`가 이미 있다.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/map-home/model/grid-label.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<{ gridDisplayName: typeof gridDisplayName }> =>
  import(WEB_PATH);

const GRIDS = [
  { gridId: "16858_11420", zoneName: "서면", zoneCell: "A-14" },
  { gridId: "16882_11434", zoneName: null, zoneCell: null },
];
const REGION_NAMES: (string | null | undefined)[] = [
  "부전제1동",
  null,
  undefined,
];

describe("gridDisplayName 웹 원본 동등성 (C4)", () => {
  it("구역 라벨 > 행정동명 > gridId 순으로 폴백한다", () => {
    expect(gridDisplayName(GRIDS[0], "부전제1동")).toBe("서면 A-14");
    expect(gridDisplayName(GRIDS[1], "부전제1동")).toBe("부전제1동");
    expect(gridDisplayName(GRIDS[1], null)).toBe("16882_11434");
  });

  it("표본 전건에서 웹 원본과 같은 표시명을 낸다", async () => {
    const web = await loadWeb();

    for (const grid of GRIDS) {
      for (const regionName of REGION_NAMES) {
        expect(gridDisplayName(grid, regionName)).toBe(
          web.gridDisplayName(grid, regionName),
        );
      }
    }
  });
});
