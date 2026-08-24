import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bounds } from "@/entities/cell";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useActiveMissionsQuery } from "./use-active-missions-query";

const SEOMYEON: Bounds = {
  sw: { lat: 35.153, lng: 129.053 },
  ne: { lat: 35.163, lng: 129.065 },
};

const mission = (missionId: number, type: string, shape: unknown) => ({
  missionId,
  type,
  title: `미션 ${missionId}`,
  targetCount: 1,
  startAt: null,
  endAt: null,
  shape,
  description: null,
  placeName: null,
  sourceUrl: null,
  operationTime: null,
  imageUrl: null,
  distanceMeters: null,
  durationMinutes: null,
  difficulty: null,
});

/** 서버는 요청 `type`에 해당하는 미션만 준다 — 스텁이 그 계약을 강제한다 */
const stubByType = () =>
  stubFetch(async (request: Request) => {
    const type = new URL(request.url).searchParams.get("type");
    if (type === "EVENT")
      return envelopeResponse([mission(1, "EVENT", { polygon: [] })]);
    if (type === "POPUP")
      return envelopeResponse([mission(2, "POPUP", { cells: [] })]);
    return envelopeResponse([mission(3, "COURSE", { line: null, spots: [] })]);
  });

beforeEach(() => {
  signInForTest();
});

afterEach(() => {
  signOutForTest();
  vi.unstubAllGlobals();
});

describe("useActiveMissionsQuery — 칩별·확정 영역 조회 (AC 19)", () => {
  it("지역축제 칩은 EVENT 미션을 받아온다 (AC 19)", async () => {
    stubByType();

    const { result } = renderHook(
      () => useActiveMissionsQuery("festival", SEOMYEON),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.missions.map((m) => m.missionId)).toEqual([1]);
  });

  it("경로추천 칩은 COURSE 미션을 받아온다 (AC 19)", async () => {
    stubByType();

    const { result } = renderHook(
      () => useActiveMissionsQuery("route", SEOMYEON),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.missions.map((m) => m.missionId)).toEqual([3]);
  });

  it("확정 영역이 아직 없으면 조회하지 않는다 — 지도 준비 전 (AC 12)", async () => {
    const fetchSpy = vi.fn(async () => envelopeResponse([]));
    stubFetch(fetchSpy);

    const { result } = renderHook(
      () => useActiveMissionsQuery("festival", null),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.missions).toEqual([]);
  });

  it("칩이 꺼져 있으면 조회하지 않는다 (AC 19)", async () => {
    const fetchSpy = vi.fn(async () => envelopeResponse([]));
    stubFetch(fetchSpy);

    const { result } = renderHook(
      () => useActiveMissionsQuery(null, SEOMYEON),
      {
        wrapper,
      },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // MSG-462 AC 13: 서버 MSG-454가 익명 조회를 허용해 MSG-403의 익명 게이트를 해제했다 —
  // "조회하지 않는다" 단정을 반대로 갱신한다 (비로그인 + 칩 활성에서 영역이 그려져야 한다)
  it("비로그인 상태에서도 조회한다 — 익명 게이트 해제 (MSG-462 AC 13)", async () => {
    signOutForTest();
    stubByType();

    const { result } = renderHook(
      () => useActiveMissionsQuery("festival", SEOMYEON),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.missions.map((m) => m.missionId)).toEqual([1]);
  });

  it("조회가 실패하면 빈 목록과 함께 실패로 알린다 (AC 19)", async () => {
    stubFetch(async () => new Response("boom", { status: 500 }));
    // 에러 경로는 재시도 백오프를 타면 타임아웃한다 — 공용 래퍼 대신 retry:false 클라이언트
    const noRetryWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(
      () => useActiveMissionsQuery("festival", SEOMYEON),
      { wrapper: noRetryWrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.missions).toEqual([]);
  });
});
