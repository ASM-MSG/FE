import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { useGridVideosQuery } from "./use-grid-videos-query";

/**
 * 격자 영상 목록 조합 훅 (MSG-326 기준 7).
 * 전역(`/videos` 첫 페이지)·내 영상(`/my-videos`) 2쿼리를 병합해
 * 상세 패널 피드가 쓰는 단일 결과({items, isPending, isError, isEmpty, retry})를 만든다.
 */

const SEOMYEON_GRID_ID = "39064_112221";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

/** 전역 페이지·내 영상 응답 스텁 — pathname으로 두 목록을 구분한다 */
const stubGridVideos = ({
  global,
  mine,
}: {
  global: unknown[];
  mine: unknown[];
}) => {
  const fetchMock = vi.fn<(input: Request) => Promise<Response>>(
    async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname.endsWith("/my-videos")) return envelopeResponse(mine);
      return envelopeResponse({
        videos: global,
        hasNext: false,
        nextCursor: null,
      });
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const globalDto = (videoId: number) => ({
  videoId,
  thumbnailUrl: `https://cdn.example/thumb-${videoId}.jpg`,
  durationSec: 27,
  viewCount: 1400,
  recordedAt: "2026-07-31T18:03:11",
  nickname: "minji_b",
});

const mineDto = (videoId: number) => ({
  videoId,
  thumbnailUrl: null,
  processingStatus: "READY",
  durationSec: 22,
  createdAt: "2026-08-10T09:12:00",
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useGridVideosQuery", () => {
  it("gridId가 null이면 두 목록 쿼리 모두 부르지 않는다 (기준 7)", async () => {
    const fetchMock = stubGridVideos({ global: [], mine: [] });

    const { result } = renderHook(() => useGridVideosQuery(null), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.items).toEqual([]);
    expect(result.current.isEmpty).toBe(false);
  });

  it("응답 도착 시 내 영상이 앞이고 전역의 같은 videoId는 제거된 병합 결과가 나온다 (기준 7·3)", async () => {
    stubGridVideos({
      global: [globalDto(301), globalDto(2001)], // 301은 내 영상과 중복
      mine: [mineDto(301)],
    });

    const { result } = renderHook(() => useGridVideosQuery(SEOMYEON_GRID_ID), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items.map((v) => v.videoId)).toEqual([301, 2001]);
    expect(result.current.items.map((v) => v.mine)).toEqual([true, false]);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("둘 다 0건이면 빈 목록 판정(isEmpty)이 나온다 (기준 7)", async () => {
    stubGridVideos({ global: [], mine: [] });

    const { result } = renderHook(() => useGridVideosQuery(SEOMYEON_GRID_ID), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(result.current.isEmpty).toBe(true);
  });
});
