import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import type { FeedVideo } from "./grid-videos";
import { useVideoPlaybackQuery } from "./use-video-playback-query";

/**
 * 단건 재생 조회 훅 (MSG-326 기준 5·6).
 * - staleTime은 응답 expiresInSec에서 유도된다 — 경과 후 같은 영상을 다시 열면
 *   재조회해 만료된 presigned URL이 캐시에서 재생되지 않는다 (기준 5).
 * - videoSrc 보유 선택(테마 피드 목 경로)은 쿼리를 부르지 않는다 (기준 6, 추정 8).
 */

const SEOMYEON_GRID_ID = "39064_112221";

/** 재시도를 끈다 — 검증 대상은 staleTime 계약이지 재시도 정책이 아니다 */
const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

const feedVideo = (overrides: Partial<FeedVideo> = {}): FeedVideo => ({
  videoId: 1042,
  thumbnailUrl: "https://cdn.example/thumb.jpg",
  durationSec: 27,
  viewCount: 1400,
  recordedAt: "2026-07-31T18:03:11",
  ...overrides,
});

const stubPlayback = (expiresInSec: number | null) => {
  const fetchMock = vi.fn<(input: Request) => Promise<Response>>(async () =>
    envelopeResponse({
      videoId: 1042,
      playbackUrl: "https://cdn.example/play-1042.mp4",
      thumbnailUrl: "https://cdn.example/thumb.jpg",
      gridId: SEOMYEON_GRID_ID,
      durationSec: 27,
      processingStatus: "READY",
      visibility: "PUBLIC",
      status: "ACTIVE",
      viewCount: 1400,
      recordedAt: "2026-07-31T18:03:11",
      expiresInSec,
      zoneName: "서면",
      zoneCell: "A-14",
      regionName: null,
      highlights: null,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useVideoPlaybackQuery", () => {
  it("staleTime 이내에 같은 영상을 다시 열면 캐시를 사용한다 — 재조회 없음 (기준 5)", async () => {
    const fetchMock = stubPlayback(600); // staleTime 570초
    const client = createClient();
    const wrapper = wrapperFor(client);

    const first = renderHook(() => useVideoPlaybackQuery(feedVideo()), {
      wrapper,
    });
    await waitFor(() => expect(first.result.current.playback).not.toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    first.unmount();

    // 같은 영상 재오픈 — fresh 캐시라 즉시 제공되고 재조회하지 않는다
    const second = renderHook(() => useVideoPlaybackQuery(feedVideo()), {
      wrapper,
    });
    expect(second.result.current.playback?.playbackUrl).toBe(
      "https://cdn.example/play-1042.mp4",
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("staleTime 경과 후 다시 열면 재조회한다 — 만료 URL 캐시 재생 차단 (기준 5)", async () => {
    // Date만 fake — setTimeout·fetch 흐름은 실제 타이머로 waitFor와 공존한다
    vi.useFakeTimers({ toFake: ["Date"] });
    const fetchMock = stubPlayback(600);
    const client = createClient();
    const wrapper = wrapperFor(client);

    const first = renderHook(() => useVideoPlaybackQuery(feedVideo()), {
      wrapper,
    });
    await waitFor(() => expect(first.result.current.playback).not.toBeNull());
    first.unmount();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // staleTime(570초) 경과 — presigned URL 만료(600초) 직전 마진 구간
    vi.setSystemTime(Date.now() + 571_000);

    renderHook(() => useVideoPlaybackQuery(feedVideo()), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("videoSrc 보유 선택(테마 피드 목 경로)은 쿼리를 부르지 않는다 (기준 6, 추정 8)", async () => {
    const fetchMock = stubPlayback(600);
    const client = createClient();

    const { result } = renderHook(
      () =>
        useVideoPlaybackQuery(
          feedVideo({
            videoSrc: "https://mdn.github.io/shared-assets/videos/flower.mp4",
          }),
        ),
      { wrapper: wrapperFor(client) },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.playback).toBeNull();
    expect(result.current.isPending).toBe(false);
  });
});
