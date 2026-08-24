import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useGridMissionRouting } from "./use-grid-mission-routing";

const GRID = "16846_11428";

const gridMission = (missionId: number, type: string) => ({
  missionId,
  type,
  title: `미션 ${missionId}`,
  startAt: null,
  endAt: null,
  videoCount: 3,
});

const setup = (input: {
  chip: "festival" | "popup" | null;
  membership?: ReadonlyMap<string, number>;
}) => {
  const selectMission = vi.fn();
  const selectCell = vi.fn();
  const { result } = renderHook(
    () =>
      useGridMissionRouting({
        chip: input.chip,
        membership: input.membership ?? new Map(),
        selectMission,
        selectCell,
      }),
    { wrapper },
  );
  return { selectMission, selectCell, handle: result.current };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useGridMissionRouting — 칩 활성 격자 탭의 미션 라우팅 (AC 7·8·10·13)", () => {
  it("격자 탭 시 대표 격자 미션을 조회해 그 행사의 상세를 연다 (AC 7)", async () => {
    stubFetch(async () => envelopeResponse([gridMission(7, "EVENT")]));
    const { selectMission, selectCell, handle } = setup({ chip: "festival" });

    handle(GRID);

    await waitFor(() => expect(selectMission).toHaveBeenCalledWith(7));
    expect(selectCell).not.toHaveBeenCalled();
  });

  it("대표 격자가 아니면(빈 배열) 도형 소속 미션으로 같은 상세를 연다 (AC 8)", async () => {
    stubFetch(async () => envelopeResponse([]));
    const { selectMission, handle } = setup({
      chip: "festival",
      membership: new Map([[GRID, 5]]),
    });

    handle(GRID);

    await waitFor(() => expect(selectMission).toHaveBeenCalledWith(5));
  });

  it("미션 조회 실패 시 화면을 막는 오류 없이 격자 상세로 폴백한다 (AC 10)", async () => {
    stubFetch(async () => new Response("boom", { status: 500 }));
    const { selectMission, selectCell, handle } = setup({ chip: "festival" });

    handle(GRID);

    await waitFor(() => expect(selectCell).toHaveBeenCalledWith(GRID));
    expect(selectMission).not.toHaveBeenCalled();
  });

  it("비로그인 상태에서도 게이트 없이 조회해 미션 상세를 연다 (AC 13)", async () => {
    signOutForTest();
    const received = stubFetch(async () =>
      envelopeResponse([gridMission(7, "EVENT")]),
    );
    const { selectMission, handle } = setup({ chip: "festival" });

    handle(GRID);

    await waitFor(() => expect(selectMission).toHaveBeenCalledWith(7));
    expect(received).toHaveLength(1);
  });

  it("칩이 없으면 조회 없이 격자 상세로 직행한다 — 기존 경로 보존 (AC 11)", () => {
    const received = stubFetch(async () => envelopeResponse([]));
    const { selectCell, handle } = setup({ chip: null });

    handle(GRID);

    expect(selectCell).toHaveBeenCalledWith(GRID);
    expect(received).toHaveLength(0);
  });
});
