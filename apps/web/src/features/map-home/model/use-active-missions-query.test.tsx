import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useActiveMissionsQuery } from "./use-active-missions-query";

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useActiveMissionsQuery — 활성 미션을 칩별로 갈라 준다 (AC 1)", () => {
  it("응답을 지역축제·팝업스토어·경로추천 버킷으로 나눈다 (AC 1)", async () => {
    stubFetch(async () =>
      envelopeResponse([
        mission(1, "EVENT", { polygon: [] }),
        mission(2, "POPUP", { cells: [] }),
        mission(3, "COURSE", { line: null, spots: [] }),
      ]),
    );

    const { result } = renderHook(() => useActiveMissionsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.buckets.festival.map((m) => m.missionId)).toEqual([
      1,
    ]);
    expect(result.current.buckets.popup.map((m) => m.missionId)).toEqual([2]);
    expect(result.current.buckets.route.map((m) => m.missionId)).toEqual([3]);
  });

  it("조회가 실패하면 빈 버킷과 함께 실패로 알린다 (AC 26)", async () => {
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

    const { result } = renderHook(() => useActiveMissionsQuery(), {
      wrapper: noRetryWrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.buckets.festival).toEqual([]);
  });
});
