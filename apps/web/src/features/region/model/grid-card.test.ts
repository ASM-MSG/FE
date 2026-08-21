import { describe, expect, it } from "vitest";
import { gridCardLabel } from "./grid-card";

describe("gridCardLabel — 격자명 조합 (AC 6)", () => {
  it("zoneName과 zoneCell을 공백으로 잇는다 ('서면 A-14')", () => {
    expect(gridCardLabel("서면", "A-14", "부전제1동")).toBe("서면 A-14");
  });

  it("zoneName이 null이면 상위 응답의 regionName으로 폴백한다", () => {
    expect(gridCardLabel(null, null, "부전제1동")).toBe("부전제1동");
  });
});
