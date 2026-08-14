import { describe, expect, it } from "vitest";
import { clampPct, formatExploreSummary } from "./dex-summary";

describe("clampPct — 탐험률 0~100 클램프 (기준 4)", () => {
  it("범위 안 값은 그대로 둔다", () => {
    expect(clampPct(52)).toBe(52);
  });

  it("100 초과는 100으로 자른다 (경계)", () => {
    expect(clampPct(140)).toBe(100);
  });

  it("음수는 0으로 올린다 (경계)", () => {
    expect(clampPct(-3)).toBe(0);
  });
});

describe("formatExploreSummary — 프로필 헤더 보조 문구 (기준 2)", () => {
  it("방문 동네 수와 수집 격자 수를 함께 보여준다", () => {
    expect(
      formatExploreSummary({ visitedRegionCount: 3, totalGridCount: 6 }),
    ).toBe("동네 3곳 · 격자 6개 탐험");
  });

  it("수집 0건이어도 0으로 표기된다 — 문구가 사라지지 않는다 (경계)", () => {
    expect(
      formatExploreSummary({ visitedRegionCount: 0, totalGridCount: 0 }),
    ).toBe("동네 0곳 · 격자 0개 탐험");
  });
});
