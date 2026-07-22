import { describe, expect, it } from "vitest";
import { scaleLabelForLevel } from "./map-scale";

describe("scaleLabelForLevel", () => {
  it("카카오맵 레벨별 축척 표기를 반환한다", () => {
    expect(scaleLabelForLevel(1)).toBe("20m");
    expect(scaleLabelForLevel(3)).toBe("50m");
    expect(scaleLabelForLevel(5)).toBe("250m");
    expect(scaleLabelForLevel(7)).toBe("1km");
    expect(scaleLabelForLevel(8)).toBe("2km");
    expect(scaleLabelForLevel(14)).toBe("128km");
  });

  it("유효 범위(1~14) 밖 레벨은 경계 값으로 클램프한다", () => {
    expect(scaleLabelForLevel(0)).toBe("20m");
    expect(scaleLabelForLevel(-3)).toBe("20m");
    expect(scaleLabelForLevel(99)).toBe("128km");
  });

  it("비정수 레벨은 내림해 해석한다", () => {
    expect(scaleLabelForLevel(5.7)).toBe("250m");
  });

  it("NaN·Infinity 등 비정상 값은 최소 축척으로 폴백한다 (undefined 렌더 방어)", () => {
    expect(scaleLabelForLevel(Number.NaN)).toBe("20m");
    expect(scaleLabelForLevel(Number.POSITIVE_INFINITY)).toBe("128km");
    expect(scaleLabelForLevel(Number.NEGATIVE_INFINITY)).toBe("20m");
  });
});
