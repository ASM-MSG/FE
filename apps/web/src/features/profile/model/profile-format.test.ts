import { describe, expect, it } from "vitest";
import { formatJoinedDate } from "./profile-format";

describe("formatJoinedDate (AC 3)", () => {
  it("ISO 문자열을 'YYYY.MM.DD'로 변환한다 — 예: 2026-01-12 → 2026.01.12", () => {
    expect(formatJoinedDate("2026-01-12")).toBe("2026.01.12");
  });

  it("시각이 붙은 UTC ISO는 KST(+9)로 옮긴 날짜를 표기한다 — 자정을 안 넘으면 같은 날", () => {
    expect(formatJoinedDate("2026-01-12T09:30:00.000Z")).toBe("2026.01.12");
    // 서버 createdAt은 타임존 마커 없는 UTC — KST 12:24, 같은 날
    expect(formatJoinedDate("2026-01-12T03:24:11")).toBe("2026.01.12");
  });

  it("UTC 15:00(=KST 자정) 이후 가입은 KST 기준 다음 날로 표기한다 — 하루 밀림 방지 (codex 리뷰 환류)", () => {
    // KST 2026-01-13 05:00 가입자 — 날짜부를 그대로 자르면 하루 전(01-12)으로 밀린다
    expect(formatJoinedDate("2026-01-12T20:00:00")).toBe("2026.01.13");
    // 경계: UTC 15:00 = KST 00:00 정각 → 다음 날
    expect(formatJoinedDate("2026-01-12T15:00:00")).toBe("2026.01.13");
    // 경계 직전: UTC 14:59:59 = KST 23:59:59 → 같은 날
    expect(formatJoinedDate("2026-01-12T14:59:59")).toBe("2026.01.12");
    // 연 경계: UTC 12-31 15:00 = KST 새해 첫날
    expect(formatJoinedDate("2025-12-31T15:00:00")).toBe("2026.01.01");
    // Z 마커가 있어도 동일하게 UTC로 취급한다
    expect(formatJoinedDate("2026-01-12T16:00:00Z")).toBe("2026.01.13");
  });

  it("한 자리 월·일은 제로 패딩한다", () => {
    expect(formatJoinedDate("2026-3-5")).toBe("2026.03.05");
  });

  it("연-월-일 3파트가 아닌 문자열은 변환하지 않고 원본을 반환한다 (실 API 방어)", () => {
    expect(formatJoinedDate("2026-01")).toBe("2026-01");
    expect(formatJoinedDate("20260112")).toBe("20260112");
    expect(formatJoinedDate("")).toBe("");
  });
});
