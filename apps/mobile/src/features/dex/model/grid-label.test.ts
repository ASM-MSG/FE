import { describe, expect, it } from "vitest";
import { gridLabel } from "./grid-label";

/**
 * L6: `gridLabel(zoneName, zoneCell, regionName)`이 쌍이 있으면 `"서면 A-14"`,
 * `zoneName`·`zoneCell`이 null이면 상위 동 이름으로 폴백한다.
 * 웹 `features/region/model/grid-card.ts`의 `gridCardLabel` 포팅 — 홈 격자 카드와
 * 도감 갤러리가 같은 규칙으로 격자를 부른다.
 */
describe("gridLabel — 격자 표시 라벨 조합 (L6)", () => {
  it("zoneName·zoneCell 쌍이 있으면 '서면 A-14'로 조합한다 (L6)", () => {
    expect(gridLabel("서면", "A-14", "부전2동")).toBe("서면 A-14");
  });

  it("zoneName이 null이면 상위 동 이름으로 폴백한다 (L6)", () => {
    expect(gridLabel(null, "A-14", "부전2동")).toBe("부전2동");
  });

  it("zoneCell이 null이면 상위 동 이름으로 폴백한다 (L6)", () => {
    expect(gridLabel("서면", null, "부전2동")).toBe("부전2동");
  });

  it("둘 다 null(구역 밖 격자)이면 상위 동 이름으로 폴백한다 (L6)", () => {
    expect(gridLabel(null, null, "부전2동")).toBe("부전2동");
  });
});
