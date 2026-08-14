import { describe, expect, it } from "vitest";
import { formatDuration, formatMonthDay, formatViewCountKo } from "./format";

// 원래 features/explore/model/explore-cells.test.ts에 있던 검증 — 함수 이동(MSG-328)에 따라 함께 이동
describe("formatDuration — 영상 길이 m:ss 포맷", () => {
  it("초 값을 m:ss로 포맷한다", () => {
    expect(formatDuration(24)).toBe("0:24");
    expect(formatDuration(84)).toBe("1:24");
    expect(formatDuration(605)).toBe("10:05");
  });

  it("undefined이면 null을 반환한다(배지 미표시 신호)", () => {
    expect(formatDuration(undefined)).toBeNull();
  });
});

describe("formatMonthDay — ISO 시각 → 'M월 D일' 포맷 (AC 8)", () => {
  it("2026-07-21 시각을 '7월 21일'로 포맷한다", () => {
    expect(formatMonthDay("2026-07-21T12:00:00.000Z")).toBe("7월 21일");
  });

  it("한 자리 월·일은 앞자리 0 없이 표기한다 (2026-12-05 → '12월 5일')", () => {
    expect(formatMonthDay("2026-12-05T12:00:00.000Z")).toBe("12월 5일");
  });
});

describe("formatViewCountKo — 조회수 한국어 축약 (MSG-277 AC 6)", () => {
  it("1만 미만은 콤마 표기한다 (8410 → '8,410')", () => {
    expect(formatViewCountKo(8410)).toBe("8,410");
    expect(formatViewCountKo(640)).toBe("640");
    expect(formatViewCountKo(9999)).toBe("9,999");
  });

  it("1만 이상은 만 단위 소수 첫째 자리로 축약한다 (12000 → '1.2만')", () => {
    expect(formatViewCountKo(12000)).toBe("1.2만");
    expect(formatViewCountKo(24000)).toBe("2.4만");
  });

  it("만 단위 값이 정확히 떨어지면 소수 없이 표기한다 (10000 → '1만')", () => {
    expect(formatViewCountKo(10000)).toBe("1만");
  });

  it("만 단위 값이 10 이상이면 정수로 표기한다 (124000 → '12만')", () => {
    expect(formatViewCountKo(124000)).toBe("12만");
  });
});
