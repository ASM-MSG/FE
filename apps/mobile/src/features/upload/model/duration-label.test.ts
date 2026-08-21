import { describe, expect, it } from "vitest";
import { durationLabel } from "./duration-label";

/** MSG-304 AC 4 — 길이 뱃지: 실제 durationSec은 mm:ss, 없으면 mock "0:42" 폴백 */
describe("durationLabel (MSG-304 AC 4)", () => {
  it("스토어 영상의 실제 durationSec을 mm:ss로 표시한다", () => {
    expect(durationLabel(65)).toBe("1:05");
    expect(durationLabel(7)).toBe("0:07");
  });

  it("duration이 없으면 mock '0:42'로 폴백한다", () => {
    expect(durationLabel(null)).toBe("0:42");
  });
});
