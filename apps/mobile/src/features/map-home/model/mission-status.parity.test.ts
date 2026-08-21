import { describe, expect, it } from "vitest";
import { missionStatus } from "./mission-status";

/**
 * D5: 상태 pill이 `missionStatus`로 파생된다 — 완료 > 상시 > `D-N` > 종료 > 오늘까지 >
 * 진행 중 우선순위, `now` 주입 (MSG-427) — 웹 원본 동등.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/map-home/model/mission-status.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<{ missionStatus: typeof missionStatus }> =>
  import(WEB_PATH);

const NOW = new Date(2026, 7, 19, 13, 0, 0);

const SAMPLES = [
  { startAt: null, endAt: null, completed: true },
  {
    startAt: "2026-08-11T00:00:00",
    endAt: "2026-08-16T00:00:00",
    completed: true,
  },
  { startAt: null, endAt: null, completed: false },
  {
    startAt: "2026-08-22T00:00:00",
    endAt: "2026-08-25T00:00:00",
    completed: false,
  },
  {
    startAt: "2026-08-19T09:00:00",
    endAt: "2026-08-25T00:00:00",
    completed: false,
  },
  {
    startAt: "2026-08-01T00:00:00",
    endAt: "2026-08-16T00:00:00",
    completed: false,
  },
  {
    startAt: "2026-08-01T00:00:00",
    endAt: "2026-08-19T23:00:00",
    completed: false,
  },
  { startAt: "2026-08-01T00:00:00", endAt: null, completed: false },
  { startAt: null, endAt: "2026-11-07T00:00:00", completed: false },
];

describe("missionStatus 웹 원본 동등성 (D5)", () => {
  it("완료 > 상시 > D-N > 종료 > 오늘까지 > 진행 중 순으로 판정한다", () => {
    expect(missionStatus({ ...SAMPLES[1], now: NOW })).toEqual({
      kind: "completed",
      label: "완료",
    });
    expect(missionStatus({ ...SAMPLES[2], now: NOW })).toEqual({
      kind: "always",
      label: "상시",
    });
    expect(missionStatus({ ...SAMPLES[3], now: NOW })).toEqual({
      kind: "upcoming",
      label: "D-3",
    });
    expect(missionStatus({ ...SAMPLES[5], now: NOW })).toEqual({
      kind: "ended",
      label: "종료",
    });
    expect(missionStatus({ ...SAMPLES[6], now: NOW })).toEqual({
      kind: "today",
      label: "오늘까지",
    });
    expect(missionStatus({ ...SAMPLES[4], now: NOW })).toEqual({
      kind: "ongoing",
      label: "진행 중",
    });
  });

  it("표본 전건에서 웹 원본과 같은 배지를 낸다", async () => {
    const web = await loadWeb();

    for (const sample of SAMPLES) {
      expect(missionStatus({ ...sample, now: NOW })).toEqual(
        web.missionStatus({ ...sample, now: NOW }),
      );
    }
  });
});
