import { describe, expect, it } from "vitest";
import type { MissionResponseDto } from "@/shared/api/generated";
import { missionShapeOf } from "./mission";
import { missionProgress, progressRatio } from "./mission-progress";

const ORIGIN = { lat: 0, lng: 0 };

const cellsShape = (gridIds: string[]) =>
  missionShapeOf({
    shape: {
      cells: gridIds.map((gridId) => ({ gridId, lat: 35.15, lng: 129.05 })),
    },
  } as MissionResponseDto);

const collected = (gridIds: string[]) =>
  gridIds.map((gridId) => ({ gridId, center: ORIGIN }));

describe("missionProgress — 내 수집 격자를 미션 영역에 넣어 진행도를 만든다 (AC 3)", () => {
  it("미션 영역에 든 내 격자 수가 진행 수이고 targetCount가 목표 수다 (AC 3)", () => {
    const progress = missionProgress(
      cellsShape(["a", "b", "c"]),
      collected(["b", "c", "z"]),
      3,
    );

    expect(progress.done).toBe(2);
    expect(progress.total).toBe(3);
    expect(progress.completed).toBe(false);
  });

  it("진행 수가 목표 수 이상이면 완료로 판정한다 (AC 3)", () => {
    expect(
      missionProgress(cellsShape(["a", "b"]), collected(["a", "b"]), 2)
        .completed,
    ).toBe(true);
  });

  it("미션 격자보다 목표 수가 작으면 일부만 채워도 완료다 (AC 3)", () => {
    const progress = missionProgress(
      cellsShape(["a", "b", "c"]),
      collected(["b"]),
      1,
    );

    expect(progress.done).toBe(1);
    expect(progress.completed).toBe(true);
  });

  it("수집 격자가 없으면 진행 0이다 (경계)", () => {
    expect(missionProgress(cellsShape(["a"]), [], 1).done).toBe(0);
  });

  it("목표 수가 0이면 완료로 보지 않는다 (경계 — 0 나눗셈·전건 완료 방지)", () => {
    expect(missionProgress(cellsShape([]), [], 0).completed).toBe(false);
  });

  it("BOX 미션은 격자 중심 좌표로 포함을 판정한다 (AC 3)", () => {
    const shape = missionShapeOf({
      shape: {
        polygon: [
          { lat: 35.15, lng: 129.05 },
          { lat: 35.15, lng: 129.07 },
          { lat: 35.17, lng: 129.07 },
          { lat: 35.17, lng: 129.05 },
        ],
      },
    } as MissionResponseDto);

    const progress = missionProgress(
      shape,
      [
        { gridId: "in", center: { lat: 35.16, lng: 129.06 } },
        { gridId: "out", center: { lat: 35.3, lng: 129.3 } },
      ],
      1,
    );

    expect(progress.done).toBe(1);
  });
});

describe("progressRatio — 진행 바 폭 비율 (AC 20)", () => {
  it("진행/목표 비율을 반환한다 (AC 20)", () => {
    expect(progressRatio({ done: 2, total: 3, completed: false })).toBeCloseTo(
      2 / 3,
    );
  });

  it("진행이 0이면 0이다 (AC 20)", () => {
    expect(progressRatio({ done: 0, total: 3, completed: false })).toBe(0);
  });

  it("목표를 넘겨도 1을 넘지 않는다 (경계)", () => {
    expect(progressRatio({ done: 5, total: 3, completed: true })).toBe(1);
  });

  it("목표가 0이면 0이다 (경계 — 0 나눗셈)", () => {
    expect(progressRatio({ done: 0, total: 0, completed: false })).toBe(0);
  });
});
