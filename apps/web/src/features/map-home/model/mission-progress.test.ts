import { describe, expect, it } from "vitest";
import { progressRatio, toMissionProgress } from "./mission-progress";

describe("toMissionProgress — 서버 진행도를 표시 모델로 (AC 20)", () => {
  it("서버가 준 채운 칸·목표 칸·완료 여부를 그대로 쓴다 (AC 20)", () => {
    const progress = toMissionProgress(
      { missionId: 7, targetCount: 3, filledCount: 2, completed: false },
      3,
    );

    expect(progress).toEqual({ done: 2, total: 3, completed: false });
  });

  it("영상을 지워 0/1이 되어도 스탬프를 받았으면 완료로 남는다 — 서버 계약을 보정하지 않는다 (AC 20)", () => {
    const progress = toMissionProgress(
      { missionId: 9, targetCount: 1, filledCount: 0, completed: true },
      1,
    );

    expect(progress).toEqual({ done: 0, total: 1, completed: true });
  });

  it("진행도를 아직 못 받았으면 목록의 목표 칸만 쓰고 완료를 주장하지 않는다 (AC 20)", () => {
    const progress = toMissionProgress(undefined, 5);

    expect(progress).toEqual({ done: 0, total: 5, completed: false });
  });
});

describe("progressRatio — 진행 바 폭 비율 (AC 20)", () => {
  it("채운 칸/목표 칸 비율을 0~1로 준다", () => {
    expect(progressRatio({ done: 1, total: 4, completed: false })).toBe(0.25);
  });

  it("목표를 넘겨도 1에서 자르고, 목표가 0이면 0이다 (경계)", () => {
    expect(progressRatio({ done: 5, total: 3, completed: true })).toBe(1);
    expect(progressRatio({ done: 0, total: 0, completed: false })).toBe(0);
  });
});
