import { describe, expect, it } from "vitest";
import { formatJoinedDate } from "./profile-format";

describe("formatJoinedDate (AC 3)", () => {
  it("ISO 문자열을 'YYYY.MM.DD'로 변환한다 — 예: 2026-01-12 → 2026.01.12", () => {
    expect(formatJoinedDate("2026-01-12")).toBe("2026.01.12");
  });

  it("시각·타임존이 붙은 전체 ISO도 날짜부만 취해 변환한다 (타임존 무관 — 표기 날짜가 정본)", () => {
    expect(formatJoinedDate("2026-01-12T09:30:00.000Z")).toBe("2026.01.12");
  });

  it("한 자리 월·일은 제로 패딩한다", () => {
    expect(formatJoinedDate("2026-3-5")).toBe("2026.03.05");
  });
});
