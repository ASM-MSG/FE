import { describe, expect, it } from "vitest";
import { missionStatus } from "./mission-status";

/** 기준 시각 — 판정이 "오늘"에 의존하므로 now를 주입해 고정한다 */
const NOW = new Date("2026-08-14T10:00:00+09:00");

describe("missionStatus — 기간과 완료 여부로 상태 배지를 만든다 (AC 4)", () => {
  it("완료면 기간과 무관하게 완료가 우선한다 (AC 4)", () => {
    const status = missionStatus({
      startAt: "2026-08-11T00:00:00",
      endAt: "2026-08-16T23:59:59",
      completed: true,
      now: NOW,
    });

    expect(status.kind).toBe("completed");
    expect(status.label).toBe("완료");
  });

  it("시작·종료가 모두 없으면 상시다 (AC 4)", () => {
    const status = missionStatus({
      startAt: null,
      endAt: null,
      completed: false,
      now: NOW,
    });

    expect(status.kind).toBe("always");
    expect(status.label).toBe("상시");
  });

  it("시작 전이면 남은 날짜만큼 D-N이다 (AC 4)", () => {
    const status = missionStatus({
      startAt: "2026-08-17T00:00:00",
      endAt: "2026-08-20T23:59:59",
      completed: false,
      now: NOW,
    });

    expect(status.kind).toBe("upcoming");
    expect(status.label).toBe("D-3");
  });

  it("종료일이 오늘이면 오늘까지다 (AC 4)", () => {
    const status = missionStatus({
      startAt: "2026-08-10T00:00:00",
      endAt: "2026-08-14T22:00:00",
      completed: false,
      now: NOW,
    });

    expect(status.kind).toBe("today");
    expect(status.label).toBe("오늘까지");
  });

  it("기간 중이면 진행 중이다 (AC 4)", () => {
    const status = missionStatus({
      startAt: "2026-08-11T00:00:00",
      endAt: "2026-08-16T23:59:59",
      completed: false,
      now: NOW,
    });

    expect(status.kind).toBe("ongoing");
    expect(status.label).toBe("진행 중");
  });

  it("종료일이 지났으면 종료다 (경계)", () => {
    const status = missionStatus({
      startAt: "2026-08-01T00:00:00",
      endAt: "2026-08-05T23:59:59",
      completed: false,
      now: NOW,
    });

    expect(status.kind).toBe("ended");
    expect(status.label).toBe("종료");
  });

  it("시작이 오늘이면 D-0이 아니라 진행 중이다 (경계)", () => {
    const status = missionStatus({
      startAt: "2026-08-14T18:00:00",
      endAt: "2026-08-20T23:59:59",
      completed: false,
      now: NOW,
    });

    expect(status.kind).toBe("ongoing");
  });
});
