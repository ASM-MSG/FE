import { describe, expect, it } from "vitest";
import { getNextStep, getPrevStep } from "./upload-wizard";

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

describe("getPrevStep — 이전 단계 복귀 전이 (MSG-352 C2)", () => {
  // C2: preview(4/4)의 이전 단계는 항상 blur(3/4)
  it("미리보기(preview)에서는 영상 길이와 무관하게 blur로 돌아간다", () => {
    expect(getPrevStep("preview", 42)).toBe("blur");
    expect(getPrevStep("preview", 3)).toBe("blur");
  });

  // C2: blur(3/4)의 이전 단계는 전진 판정(shouldOfferHighlight)과 정합 —
  // 5초 초과면 highlight를 거쳐 왔고, 5초 이하면 highlight를 건너뛰고 왔다
  it("블러 확인(blur)에서 5초를 초과하는 영상은 highlight로 돌아간다", () => {
    expect(getPrevStep("blur", 5.01)).toBe("highlight");
    expect(getPrevStep("blur", 42)).toBe("highlight");
  });

  it("블러 확인(blur)에서 정확히 5초이거나 그 이하인 영상은 select로 돌아간다", () => {
    expect(getPrevStep("blur", 5)).toBe("select");
    expect(getPrevStep("blur", 3)).toBe("select");
  });

  // C2: highlight(2/4)의 이전 단계는 항상 select(1/4)
  it("하이라이트(highlight)에서는 영상 길이와 무관하게 select로 돌아간다", () => {
    expect(getPrevStep("highlight", 42)).toBe("select");
    expect(getPrevStep("highlight", 6)).toBe("select");
  });
});
