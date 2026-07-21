import { describe, expect, it } from "vitest";
import { getNextStep } from "./upload-wizard";

describe("getNextStep — 위저드 스텝 전이", () => {
  // L1: select에서 duration > 5초이면 highlight, 5초 이하(정확히 5초 포함)이면 blur
  it("1단계에서 5초를 초과하는 영상은 다음 스텝이 highlight다", () => {
    expect(getNextStep("select", 5.01)).toBe("highlight");
    expect(getNextStep("select", 6)).toBe("highlight");
    expect(getNextStep("select", 60)).toBe("highlight");
  });

  it("1단계에서 정확히 5초이거나 그 이하인 영상은 하이라이트를 건너뛰고 blur로 간다", () => {
    expect(getNextStep("select", 5)).toBe("blur");
    expect(getNextStep("select", 4.9)).toBe("blur");
    expect(getNextStep("select", 1)).toBe("blur");
  });

  // L2: highlight에서는 duration과 무관하게 항상 blur
  it("2단계(highlight)에서는 영상 길이와 무관하게 항상 blur로 간다", () => {
    expect(getNextStep("highlight", 6)).toBe("blur");
    expect(getNextStep("highlight", 120)).toBe("blur");
    expect(getNextStep("highlight", 3)).toBe("blur");
  });
});
