import { describe, expect, it } from "vitest";
import { clampPct } from "./dex-summary";

/**
 * L8: `clampPct(v)`가 음수를 0으로, 100 초과를 100으로 자른다.
 * 서버 progressRate는 100 상한 clamp를 하지만 이중 방어 겸 음수 방어다 (웹 MSG-327 기준 4 포팅).
 */
describe("clampPct — 탐험률 0~100 클램프 (L8)", () => {
  it("음수는 0으로 잘린다 (L8)", () => {
    expect(clampPct(-1)).toBe(0);
  });

  it("100 초과는 100으로 잘린다 (L8)", () => {
    expect(clampPct(100.7)).toBe(100);
  });

  it("0~100 범위 값은 그대로 통과한다 (L8)", () => {
    expect(clampPct(0)).toBe(0);
    expect(clampPct(0.4)).toBe(0.4);
    expect(clampPct(52)).toBe(52);
    expect(clampPct(100)).toBe(100);
  });
});
