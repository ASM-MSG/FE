import { describe, expect, it } from "vitest";
import { gridCardLabel } from "./grid-card";

/**
 * L5: gridCardLabel(zoneName, zoneCell, regionName)이 둘 다 있으면 "서면 A-14",
 * 어느 한쪽이라도 null이면 regionName을 반환한다 (MSG-423) — 웹 원본 동등.
 * 웹 원본은 변수 경로 동적 import (grid.parity.test.ts 선례).
 */
const WEB_GRID_CARD_PATH = new URL(
  "../../../../../web/src/features/region/model/grid-card.ts",
  import.meta.url,
).pathname;

const loadWebGridCard = (): Promise<{ gridCardLabel: typeof gridCardLabel }> =>
  import(WEB_GRID_CARD_PATH);

/** [zoneName, zoneCell, regionName] 표본 — 정상 조합 + null 세 갈래 */
const SAMPLES: [string | null, string | null, string][] = [
  ["서면", "A-14", "부전제1동"],
  ["전포", "B-07", "전포1동"],
  [null, null, "부전제1동"],
  [null, "A-14", "부전제1동"],
  ["서면", null, "부전제1동"],
];

describe("gridCardLabel 동등성 (L5)", () => {
  it("zoneName·zoneCell이 둘 다 있으면 '서면 A-14'로 조합한다", () => {
    expect(gridCardLabel("서면", "A-14", "부전제1동")).toBe("서면 A-14");
  });

  it("zoneName·zoneCell 중 하나라도 null이면 regionName으로 폴백한다", () => {
    expect(gridCardLabel(null, null, "부전제1동")).toBe("부전제1동");
    expect(gridCardLabel(null, "A-14", "부전제1동")).toBe("부전제1동");
    expect(gridCardLabel("서면", null, "부전제1동")).toBe("부전제1동");
  });

  it("표본 전건에서 웹 원본과 같은 라벨을 낸다", async () => {
    const web = await loadWebGridCard();

    for (const [zoneName, zoneCell, regionName] of SAMPLES) {
      expect(gridCardLabel(zoneName, zoneCell, regionName)).toBe(
        web.gridCardLabel(zoneName, zoneCell, regionName),
      );
    }
  });
});
