import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useMissionDetailQuery } from "./use-mission-detail-query";

const DETAIL = {
  mission: {
    missionId: 12,
    type: "COURSE",
    title: "해안 산책 코스",
    targetCount: 3,
    startAt: null,
    endAt: null,
    shape: { line: null, spots: [] },
    description: null,
    placeName: null,
    sourceUrl: null,
    operationTime: null,
    imageUrl: null,
    distanceMeters: 2400,
    durationMinutes: 60,
    difficulty: null,
  },
  progress: {
    missionId: 12,
    targetCount: 3,
    filledCount: 1,
    completed: false,
  },
  videoCount: 5,
  spotStats: [
    { gridId: "16858_11420", visited: true, videoCount: 2 },
    { gridId: "16858_11421", visited: false, videoCount: 0 },
  ],
};

beforeEach(() => {
  signInForTest();
});

afterEach(() => {
  signOutForTest();
  vi.unstubAllGlobals();
});

describe("useMissionDetailQuery — 미션 상세(진행도·스팟 통계) (AC 21)", () => {
  it("스팟별 방문 여부와 영상 수를 격자 id로 찾을 수 있다 (AC 21)", async () => {
    stubFetch(async () => envelopeResponse(DETAIL));

    const { result } = renderHook(() => useMissionDetailQuery(12), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.spotStats.get("16858_11420")).toEqual({
      visited: true,
      videoCount: 2,
    });
    expect(result.current.spotStats.get("16858_11421")?.visited).toBe(false);
  });

  it("상세의 진행도와 영상 수를 함께 준다 (AC 21)", async () => {
    stubFetch(async () => envelopeResponse(DETAIL));

    const { result } = renderHook(() => useMissionDetailQuery(12), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.progress?.filledCount).toBe(1);
    expect(result.current.videoCount).toBe(5);
  });

  it("비로그인에서도 조회하고, 익명 응답의 progress null을 그대로 준다 — MSG-454로 익명 조회 허용 (AC 8·9)", async () => {
    signOutForTest();
    stubFetch(async () => envelopeResponse({ ...DETAIL, progress: null }));

    const { result } = renderHook(() => useMissionDetailQuery(12), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.progress).toBeNull();
    expect(result.current.spotStats.get("16858_11420")?.visited).toBe(true);
  });

  it("선택된 미션이 없으면 조회하지 않는다 (AC 21)", async () => {
    const fetchSpy = vi.fn(async () => envelopeResponse(DETAIL));
    stubFetch(fetchSpy);

    const { result } = renderHook(() => useMissionDetailQuery(null), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.spotStats.size).toBe(0);
  });
});

describe("useMissionDetailQuery — 익명 게이트 해제 (MSG-462 AC 13)", () => {
  it("비로그인 상태에서도 조회한다 — 서버 MSG-454 익명 허용 (AC 13)", async () => {
    signOutForTest();
    stubFetch(async () => envelopeResponse(DETAIL));

    const { result } = renderHook(() => useMissionDetailQuery(12), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.videoCount).toBe(5);
  });
});
