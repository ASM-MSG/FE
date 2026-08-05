import { describe, expect, it } from "vitest";
import { formatKoreanViewCount, formatUploadTime } from "./theme-format";

/**
 * AC 15 (확정 5): 조회수·업로드 시점은 Figma 한국어 표기를 따른다 —
 * 조회수는 1만 미만 콤마 구분("조회 8,600")·1만 이상 만 단위 소수 1자리("조회 2.4만"),
 * 시점은 24시간 미만 상대시간("12분 전"·"2시간 전")·이상은 "M월 D일".
 */
describe("AC 15 조회수 표기 (theme-format.formatKoreanViewCount)", () => {
  it('1만 미만은 콤마 구분 — 214 → "조회 214", 8600 → "조회 8,600"', () => {
    expect(formatKoreanViewCount(214)).toBe("조회 214");
    expect(formatKoreanViewCount(8_600)).toBe("조회 8,600");
    expect(formatKoreanViewCount(9_999)).toBe("조회 9,999");
  });

  it('1만 이상은 만 단위 소수 1자리 — 24000 → "조회 2.4만"', () => {
    expect(formatKoreanViewCount(24_000)).toBe("조회 2.4만");
    expect(formatKoreanViewCount(123_000)).toBe("조회 12.3만");
  });

  it('만 단위가 정수로 떨어지면 소수점을 붙이지 않는다 — 10000 → "조회 1만", 20000 → "조회 2만"', () => {
    expect(formatKoreanViewCount(10_000)).toBe("조회 1만");
    expect(formatKoreanViewCount(20_000)).toBe("조회 2만");
  });
});

describe("AC 15 업로드 시점 표기 (theme-format.formatUploadTime)", () => {
  const now = new Date("2026-08-04T15:00:00+09:00");

  it('1시간 미만은 "N분 전"', () => {
    expect(formatUploadTime("2026-08-04T14:48:00+09:00", now)).toBe("12분 전");
    expect(formatUploadTime("2026-08-04T14:01:00+09:00", now)).toBe("59분 전");
  });

  it('1분 미만은 "방금 전" (기존 formatRelativeTime 관례 준용)', () => {
    expect(formatUploadTime("2026-08-04T14:59:30+09:00", now)).toBe("방금 전");
  });

  it('24시간 미만은 "N시간 전"', () => {
    expect(formatUploadTime("2026-08-04T13:00:00+09:00", now)).toBe("2시간 전");
    expect(formatUploadTime("2026-08-03T15:30:00+09:00", now)).toBe(
      "23시간 전",
    );
  });

  it('24시간 이상은 "M월 D일" — KST 기준 날짜 (실행 환경 타임존과 무관)', () => {
    expect(formatUploadTime("2026-07-31T12:00:00+09:00", now)).toBe("7월 31일");
    // UTC로 넘긴 값도 KST 날짜로 환산된다 — 7/31 23:00Z = KST 8/1 08:00
    expect(formatUploadTime("2026-07-31T23:00:00Z", now)).toBe("8월 1일");
  });
});
