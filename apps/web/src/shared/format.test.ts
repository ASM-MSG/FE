import { describe, expect, it } from "vitest";
import { formatMonthDay } from "./format";

describe("formatMonthDay — ISO 시각 → 'M월 D일' 포맷 (AC 8)", () => {
  it("2026-07-21 시각을 '7월 21일'로 포맷한다", () => {
    expect(formatMonthDay("2026-07-21T12:00:00.000Z")).toBe("7월 21일");
  });

  it("한 자리 월·일은 앞자리 0 없이 표기한다 (2026-12-05 → '12월 5일')", () => {
    expect(formatMonthDay("2026-12-05T12:00:00.000Z")).toBe("12월 5일");
  });
});
