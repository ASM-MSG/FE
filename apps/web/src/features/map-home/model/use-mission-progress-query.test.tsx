import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useMissionProgressQuery } from "./use-mission-progress-query";

beforeEach(() => {
  signInForTest();
});

afterEach(() => {
  signOutForTest();
  vi.unstubAllGlobals();
});

describe("useMissionProgressQuery — 미션별 내 진행도 (AC 20)", () => {
  it("미션 id로 진행도를 찾을 수 있다 (AC 20)", async () => {
    stubFetch(async () =>
      envelopeResponse([
        { missionId: 7, targetCount: 3, filledCount: 2, completed: false },
        { missionId: 9, targetCount: 1, filledCount: 0, completed: true },
      ]),
    );

    const { result } = renderHook(() => useMissionProgressQuery([7, 9]), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.byMissionId.get(7)?.filledCount).toBe(2);
    expect(result.current.byMissionId.get(9)?.completed).toBe(true);
  });

  it("응답에서 빠진 미션은 진행도가 없다 — 서버가 모르는 id (AC 20)", async () => {
    stubFetch(async () =>
      envelopeResponse([
        { missionId: 7, targetCount: 3, filledCount: 2, completed: false },
      ]),
    );

    const { result } = renderHook(() => useMissionProgressQuery([7, 404]), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.byMissionId.get(404)).toBeUndefined();
  });

  it("조회 대상 미션이 없으면 요청하지 않는다 (AC 20)", async () => {
    const fetchSpy = vi.fn(async () => envelopeResponse([]));
    stubFetch(fetchSpy);

    const { result } = renderHook(() => useMissionProgressQuery([]), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.byMissionId.size).toBe(0);
  });

  it("비로그인 상태에서는 조회하지 않는다 (AC 19·23)", async () => {
    signOutForTest();
    const fetchSpy = vi.fn(async () => envelopeResponse([]));
    stubFetch(fetchSpy);

    const { result } = renderHook(() => useMissionProgressQuery([7]), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
