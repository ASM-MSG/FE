import { describe, expect, it } from "vitest";
import { formatRelativeTime, formatViewCount } from "./cell-detail";

describe("formatViewCount — 조회수 축약 (AC 13)", () => {
  it("1000 미만은 그대로 표시한다 (138 → '138')", () => {
    expect(formatViewCount(138)).toBe("138");
  });

  it("천 단위는 소수 첫째 자리 K로 축약한다 (1400 → '1.4K')", () => {
    expect(formatViewCount(1400)).toBe("1.4K");
  });

  it("만 단위 이상은 소수 없이 K로 축약한다 (12000 → '12K')", () => {
    expect(formatViewCount(12000)).toBe("12K");
  });

  it("0을 그대로 표시한다", () => {
    expect(formatViewCount(0)).toBe("0");
  });
});

describe("formatRelativeTime — 상대 시간 (AC 14)", () => {
  const now = new Date("2026-07-20T12:00:00.000Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it("분 경과를 'N분 전'으로 변환한다 (5분 전)", () => {
    expect(formatRelativeTime(ago(5 * MIN), now)).toBe("5분 전");
  });

  it("시간 경과를 'N시간 전'으로 변환한다 (3시간 전)", () => {
    expect(formatRelativeTime(ago(3 * HOUR), now)).toBe("3시간 전");
  });

  it("일 경과를 'N일 전'으로 변환한다 (2일 전)", () => {
    expect(formatRelativeTime(ago(2 * DAY), now)).toBe("2일 전");
  });

  it("1분 미만은 '방금 전'으로 표시한다", () => {
    expect(formatRelativeTime(ago(30_000), now)).toBe("방금 전");
  });
});
