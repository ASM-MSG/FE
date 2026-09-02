import { describe, expect, it } from "vitest";
import * as mobile from "./event-chip";

/**
 * AC 5: `kstDateOf`·`todayKstDate`·`dDayLabel`·`toEventSegments`가 웹 원본과 동등하다
 * (MSG-557 D7·D8). 웹 원본은 변수 경로 동적 import (viewport-query.parity 선례).
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/event/model/event-chip.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<typeof mobile> => import(WEB_PATH);

/** 오프셋 없음(서버 LocalDateTime) · Z · +09:00 · 날짜가 넘어가는 음수 오프셋 */
const DATE_TIMES = [
  "2026-09-05T14:00:00",
  "2026-09-04T15:30:00Z",
  "2026-09-05T00:00:00+09:00",
  "2026-09-04T20:00:00-05:00",
  "2026-12-31T23:00:00Z",
];

const CHIPS: mobile.EventSegmentView[] extends never
  ? never
  : Parameters<typeof mobile.toEventSegments>[0] = [
  {
    occurrenceId: 5,
    title: "서면 목데이터 축제",
    cityName: "부산",
    startsAt: "2026-08-25T00:00:00",
    endsAt: "2026-09-30T23:59:59",
    status: "LIVE",
  },
  {
    occurrenceId: 3,
    title: "서울세계불꽃축제",
    cityName: "서울",
    startsAt: "2026-09-05T14:00:00",
    endsAt: "2026-09-05T22:00:00",
    status: "UPCOMING",
  },
];

describe("event-chip 웹 원본 동등성 (AC 5)", () => {
  it("DAY_MS·KST_OFFSET_MS 상수가 웹과 같다", async () => {
    const web = await loadWeb();

    expect(mobile.DAY_MS).toBe(web.DAY_MS);
    expect(mobile.KST_OFFSET_MS).toBe(web.KST_OFFSET_MS);
  });

  it("todayKstDate가 같은 nowMs에 같은 KST 날짜를 낸다", async () => {
    const web = await loadWeb();
    // UTC 2026-09-01 16:00 = KST 2026-09-02 01:00 — 날짜가 갈리는 표본
    const samples = [Date.UTC(2026, 8, 1, 16), Date.UTC(2026, 8, 1, 14), 0];

    for (const nowMs of samples) {
      expect(mobile.todayKstDate(nowMs)).toBe(web.todayKstDate(nowMs));
    }
    expect(mobile.todayKstDate(Date.UTC(2026, 8, 1, 16))).toBe("2026-09-02");
  });

  it("kstDateOf가 오프셋 유무·부호에 관계없이 웹과 같은 KST 날짜부를 낸다", async () => {
    const web = await loadWeb();

    for (const dateTime of DATE_TIMES) {
      expect(mobile.kstDateOf(dateTime)).toBe(web.kstDateOf(dateTime));
    }
    expect(mobile.kstDateOf("2026-09-04T20:00:00-05:00")).toBe("2026-09-05");
  });

  it("dDayLabel이 미래는 D-n, 당일·경과는 D-0 — 웹과 전건 동일 (D7)", async () => {
    const web = await loadWeb();
    const cases: [string, string][] = [
      ["2026-09-05T14:00:00", "2026-09-02"],
      ["2026-09-05T14:00:00", "2026-09-05"],
      ["2026-09-05T14:00:00", "2026-09-07"],
      ["2026-09-04T15:30:00Z", "2026-09-02"],
    ];

    for (const [startsAt, today] of cases) {
      expect(mobile.dDayLabel(startsAt, today)).toBe(
        web.dDayLabel(startsAt, today),
      );
    }
    expect(mobile.dDayLabel("2026-09-05T14:00:00", "2026-09-02")).toBe("D-3");
    expect(mobile.dDayLabel("2026-09-05T14:00:00", "2026-09-07")).toBe("D-0");
  });

  it("toEventSegments가 서버 정렬을 유지하고 UPCOMING에만 D-day를 붙인다 — 웹과 동일", async () => {
    const web = await loadWeb();

    expect(mobile.toEventSegments(CHIPS, "2026-09-02")).toEqual(
      web.toEventSegments(CHIPS, "2026-09-02"),
    );
    expect(mobile.toEventSegments(CHIPS, "2026-09-02")).toEqual([
      {
        occurrenceId: 5,
        title: "서면 목데이터 축제",
        status: "LIVE",
        dDay: null,
      },
      {
        occurrenceId: 3,
        title: "서울세계불꽃축제",
        status: "UPCOMING",
        dDay: "D-3",
      },
    ]);
  });
});
