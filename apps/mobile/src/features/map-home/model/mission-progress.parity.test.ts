import { describe, expect, it } from "vitest";
import { progressRatio, toMissionProgress } from "./mission-progress";

/**
 * E3: 진행 바 폭이 `progressRatio`(= `min(1, done/total)`)로 정해진다 (MSG-427) —
 * 웹 원본 동등. 진행도 미도착(undefined)은 완료를 주장하지 않는다.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/map-home/model/mission-progress.ts",
  import.meta.url,
).pathname;

interface WebProgress {
  toMissionProgress: typeof toMissionProgress;
  progressRatio: typeof progressRatio;
}

const loadWeb = (): Promise<WebProgress> => import(WEB_PATH);

const DTOS = [
  undefined,
  { missionId: 1, targetCount: 3, filledCount: 0, completed: false },
  { missionId: 2, targetCount: 3, filledCount: 2, completed: false },
  { missionId: 3, targetCount: 3, filledCount: 5, completed: true },
  { missionId: 4, targetCount: 0, filledCount: 0, completed: true },
];

describe("mission-progress 웹 원본 동등성 (E3)", () => {
  it("진행도가 미도착이면 목표만 쓰고 완료를 주장하지 않는다", () => {
    expect(toMissionProgress(undefined, 3)).toEqual({
      done: 0,
      total: 3,
      completed: false,
    });
  });

  it("진행 비율은 0~1로 잘리고 total 0이면 0이다", () => {
    expect(progressRatio({ done: 2, total: 4, completed: false })).toBe(0.5);
    expect(progressRatio({ done: 9, total: 4, completed: true })).toBe(1);
    expect(progressRatio({ done: 0, total: 0, completed: false })).toBe(0);
  });

  it("표본 전건에서 웹 원본과 같은 진행도·비율을 낸다", async () => {
    const web = await loadWeb();

    for (const dto of DTOS) {
      const mine = toMissionProgress(dto, 3);
      expect(mine).toEqual(web.toMissionProgress(dto, 3));
      expect(progressRatio(mine)).toBe(web.progressRatio(mine));
    }
  });
});
