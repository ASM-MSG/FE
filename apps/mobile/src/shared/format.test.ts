import { describe, expect, it } from "vitest";
import { formatDuration, formatRelativeTime, formatViewCount } from "./format";

describe("formatDuration (AC 4 — 대표 영상 길이 mm:ss 뱃지)", () => {
  it('초를 "m:ss"로 표기한다 — 24 → "0:24"', () => {
    expect(formatDuration(24)).toBe("0:24");
  });

  it('한 자리 초는 0을 채운다 — 9 → "0:09"', () => {
    expect(formatDuration(9)).toBe("0:09");
  });

  it('분 단위를 넘기면 분:초로 — 90 → "1:30"', () => {
    expect(formatDuration(90)).toBe("1:30");
  });
});

describe("formatViewCount (AC 7 — 조회 축약 표기)", () => {
  it('1000 미만은 원시 값 그대로 — 138 → "138"', () => {
    expect(formatViewCount(138)).toBe("138");
  });

  it('천 단위는 소수 첫째 자리 K — 1400 → "1.4K"', () => {
    expect(formatViewCount(1400)).toBe("1.4K");
  });
});

describe("formatRelativeTime (AC 5 — 최근 업로드 경과 시간)", () => {
  it('5분 경과는 "5분 전"', () => {
    const now = new Date("2026-08-04T12:05:00+09:00");
    expect(formatRelativeTime("2026-08-04T12:00:00+09:00", now)).toBe("5분 전");
  });
});
