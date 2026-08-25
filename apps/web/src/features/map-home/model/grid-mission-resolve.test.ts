import { describe, expect, it } from "vitest";
import type { GridMissionResponseDto } from "@/shared/api/generated";
import { resolveGridMission } from "./grid-mission-resolve";

const GRID = "16846_11428";

const gridMission = (
  missionId: number,
  type: string,
): GridMissionResponseDto => ({
  missionId,
  type,
  title: `미션 ${missionId}`,
  startAt: null,
  endAt: null,
  videoCount: 3,
});

const NO_MEMBERSHIP: ReadonlyMap<string, number> = new Map();

describe("resolveGridMission — 격자 클릭 대상 판정 (AC 6)", () => {
  it("응답에 활성 칩 type 일치 항목이 있으면 그중 첫 항목의 missionId를 준다 (AC 6ⓐ)", () => {
    const responses = [
      gridMission(9, "POPUP"),
      gridMission(7, "EVENT"),
      gridMission(8, "EVENT"),
    ];

    const missionId = resolveGridMission({
      gridId: GRID,
      chip: "festival",
      responses,
      membership: new Map([[GRID, 99]]),
    });

    expect(missionId).toBe(7);
  });

  it("팝업 칩은 POPUP 일치 항목을 고른다 (AC 6ⓐ)", () => {
    const responses = [gridMission(7, "EVENT"), gridMission(9, "POPUP")];

    const missionId = resolveGridMission({
      gridId: GRID,
      chip: "popup",
      responses,
      membership: NO_MEMBERSHIP,
    });

    expect(missionId).toBe(9);
  });

  it("응답이 비면 활성 미션의 도형 소속 첫 미션으로 폴백한다 (AC 6ⓑ)", () => {
    const missionId = resolveGridMission({
      gridId: GRID,
      chip: "festival",
      responses: [],
      membership: new Map([[GRID, 5]]),
    });

    expect(missionId).toBe(5);
  });

  it("type 일치가 없으면 도형 소속으로 폴백한다 — 칩 자동 전환 없음 (AC 6ⓑ, 추정 2)", () => {
    const missionId = resolveGridMission({
      gridId: GRID,
      chip: "festival",
      responses: [gridMission(9, "POPUP")],
      membership: new Map([[GRID, 5]]),
    });

    expect(missionId).toBe(5);
  });

  it("조회 실패(null)여도 도형 소속이 있으면 미션으로 판정한다 (AC 10)", () => {
    const missionId = resolveGridMission({
      gridId: GRID,
      chip: "festival",
      responses: null,
      membership: new Map([[GRID, 5]]),
    });

    expect(missionId).toBe(5);
  });

  it("소속도 없으면 null — 격자 상세로 폴백한다 (AC 6ⓒ·10)", () => {
    const missionId = resolveGridMission({
      gridId: GRID,
      chip: "festival",
      responses: null,
      membership: NO_MEMBERSHIP,
    });

    expect(missionId).toBeNull();
  });
});
