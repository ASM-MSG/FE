import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useCollectedGridsQuery } from "./use-collected-grids-query";

const collectedGrid = (gridId: string) => ({
  gridId,
  gridY: 0,
  gridX: 0,
  firstCollectedAt: "2026-08-12T09:00:00",
  lastUploadedAt: "2026-08-13T09:00:00",
  videoCount: 1,
  coverVideoId: null,
  coverThumbnailUrl: null,
  regionName: "부전동",
  zoneName: "부전",
  zoneCell: "B-07",
});

beforeEach(signInForTest);

afterEach(() => {
  vi.unstubAllGlobals();
  signOutForTest();
});

describe("useCollectedGridsQuery — 내 수집 격자 (AC 3·28)", () => {
  it("응답 격자 id를 집합으로 준다 — 미션 진행도 교집합의 입력 (AC 3)", async () => {
    stubFetch(async () =>
      envelopeResponse([
        collectedGrid("16858_11420"),
        collectedGrid("16860_11421"),
      ]),
    );

    const { result } = renderHook(() => useCollectedGridsQuery(), { wrapper });

    await waitFor(() => expect(result.current.gridIds.size).toBe(2));
    expect(result.current.gridIds.has("16858_11420")).toBe(true);
    expect(result.current.gridIds.has("없는격자")).toBe(false);
  });

  it("격자 상세가 점령 시작일을 읽을 수 있게 원본도 함께 준다 (AC 11)", async () => {
    stubFetch(async () => envelopeResponse([collectedGrid("16858_11420")]));

    const { result } = renderHook(() => useCollectedGridsQuery(), { wrapper });

    await waitFor(() => expect(result.current.grids).toHaveLength(1));
    expect(result.current.grids[0].firstCollectedAt).toBe(
      "2026-08-12T09:00:00",
    );
  });

  it("비로그인이면 조회하지 않고 빈 집합이다 (AC 28)", async () => {
    const received = stubFetch(async () =>
      envelopeResponse([collectedGrid("16858_11420")]),
    );
    signOutForTest();

    const { result } = renderHook(() => useCollectedGridsQuery(), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.gridIds.size).toBe(0);
    expect(received).toHaveLength(0);
  });
});

describe("useCollectedGridsQuery — 조회 실패 (리뷰 반영)", () => {
  /** 에러 경로는 재시도 백오프를 타면 타임아웃한다 — retry:false 클라이언트 */
  const noRetryWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  );

  it("실패를 '수집 격자 0개'로 위장하지 않고 실패로 알린다", async () => {
    stubFetch(async () => new Response(null, { status: 500 }));

    const { result } = renderHook(() => useCollectedGridsQuery(), {
      wrapper: noRetryWrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.gridIds.size).toBe(0);
  });
});
