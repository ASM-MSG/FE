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

/** 지연 제어용 deferred — 느린 응답의 도착 시점을 테스트가 쥔다 (리뷰 P1 재현) */
const deferred = () => {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const GRID_B = "16846_11429";

describe("useGridMissionRouting — 스테일 응답 폐기 (리뷰 P1)", () => {
  it("격자 연타 시 느린 이전 요청의 응답은 나중 선택을 덮지 않는다 (리뷰 P1)", async () => {
    const slow = deferred();
    stubFetch((request) => {
      const gridId = new URL(request.url).pathname.split("/")[3];
      return gridId === GRID
        ? slow.promise
        : envelopeResponse([gridMission(2, "EVENT")]);
    });
    const { selectMission, handle } = setup({ chip: "festival" });

    handle(GRID); // 느린 요청 (미션 1로 응답 예정)
    handle(GRID_B); // 빠른 요청 (미션 2)
    await waitFor(() => expect(selectMission).toHaveBeenCalledWith(2));
    slow.resolve(envelopeResponse([gridMission(1, "EVENT")]));
    await new Promise((r) => setTimeout(r, 20));

    expect(selectMission).not.toHaveBeenCalledWith(1);
    expect(selectMission).toHaveBeenCalledTimes(1);
  });

  it("요청 대기 중 칩이 꺼지면 그 응답은 폐기된다 — 유효하지 않은 칩의 미션 선택 금지 (리뷰 P1)", async () => {
    const slow = deferred();
    stubFetch(() => slow.promise);
    const selectMission = vi.fn();
    const selectCell = vi.fn();
    const { result, rerender } = renderHook(
      ({ chip }: { chip: "festival" | null }) =>
        useGridMissionRouting({
          chip,
          membership: new Map(),
          selectMission,
          selectCell,
        }),
      { wrapper, initialProps: { chip: "festival" as "festival" | null } },
    );

    result.current(GRID);
    rerender({ chip: null }); // 응답 대기 중 칩 해제
    slow.resolve(envelopeResponse([gridMission(7, "EVENT")]));
    await new Promise((r) => setTimeout(r, 20));

    expect(selectMission).not.toHaveBeenCalled();
    expect(selectCell).not.toHaveBeenCalled();
  });
});
