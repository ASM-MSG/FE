import { describe, expect, it } from "vitest";
import { formatEventPeriod } from "./event-period";

describe("formatEventPeriod — 아카이브 기간 라벨 (MSG-519 AC 4)", () => {
  it("연도는 시작에만 붙는다 — '2026.7.17–8.9' 형식·0패딩 없음", () => {
    expect(
      formatEventPeriod("2026-07-17T10:00:00", "2026-08-09T21:00:00"),
    ).toBe("2026.7.17–8.9");
  });

  it("연도가 넘어가면 양쪽에 연도가 붙는다", () => {
    expect(
      formatEventPeriod("2026-12-28T10:00:00", "2027-01-03T18:00:00"),
    ).toBe("2026.12.28–2027.1.3");
  });

  it("오프셋 있는 시각은 KST 날짜부로 환산한다 (경계 — UTC 23시는 KST 다음날)", () => {
    expect(
      formatEventPeriod("2026-07-17T23:00:00Z", "2026-08-09T21:00:00"),
    ).toBe("2026.7.18–8.9");
  });
});
