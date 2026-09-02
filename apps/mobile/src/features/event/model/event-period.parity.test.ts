import { describe, expect, it } from "vitest";
import { formatEventPeriod } from "./event-period";

/** AC 5 (D7): 종료 회차 기간 `YYYY.M.D–M.D`(연도 넘김은 양쪽 연도)가 웹 원본과 동등하다. */
const WEB_PATH = new URL(
  "../../../../../web/src/features/event/model/event-period.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<{ formatEventPeriod: typeof formatEventPeriod }> =>
  import(WEB_PATH);

const CASES: [string, string][] = [
  ["2026-07-17T00:00:00", "2026-08-09T00:00:00"],
  ["2026-12-30T10:00:00", "2027-01-02T10:00:00"],
  ["2026-08-24T16:00:00Z", "2026-09-30T14:59:59Z"],
];

describe("formatEventPeriod 웹 원본 동등성 (AC 5)", () => {
  it("같은 해는 시작에만, 해가 넘어가면 양쪽에 연도를 붙인다 — 웹과 전건 동일", async () => {
    const web = await loadWeb();

    for (const [startsAt, endsAt] of CASES) {
      expect(formatEventPeriod(startsAt, endsAt)).toBe(
        web.formatEventPeriod(startsAt, endsAt),
      );
    }
    expect(formatEventPeriod(...CASES[0])).toBe("2026.7.17–8.9");
    expect(formatEventPeriod(...CASES[1])).toBe("2026.12.30–2027.1.2");
  });
});
