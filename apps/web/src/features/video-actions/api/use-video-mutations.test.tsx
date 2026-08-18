import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import {
  getCollectionGridsQueryKey,
  getGridGlobalVideosQueryKey,
  getGridVideosQueryKey,
  getPlaybackQueryKey,
  getRegionVideosQueryKey,
  getStatByPointQueryKey,
  getSummaryQueryKey,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import { reportFailureNotice } from "../model/report";
import {
  useDeleteVideo,
  useReportVideo,
  useSetVideoVisibility,
} from "./use-video-mutations";

/** 테스트마다 새 QueryClient — 캐시 격리 + 에러 경로 타임아웃 방지(retry:false) */
const createHarness = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
};

const GRID_ID = "39064_112221";

afterEach(() => {
  vi.unstubAllGlobals();
  // 미니 패널 스토어 누수 차단 — 삭제 연동 케이스가 선택을 심는다
  useVideoMiniPanelStore.setState(
    useVideoMiniPanelStore.getInitialState(),
    true,
  );
});

describe("useSetVideoVisibility — 공개 범위 전환 (AC 2·5)", () => {
  it("PATCH /api/videos/{videoId}/visibility가 {visibility} body로 발사된다 (AC 2)", async () => {
    const received = stubFetch(() =>
      envelopeResponse({ videoId: 7, visibility: "PRIVATE" }),
    );
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useSetVideoVisibility(), { wrapper });

    act(() => {
      result.current.mutate({ videoId: 7, visibility: "PRIVATE" });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(received).toHaveLength(1);
    expect(received[0].request.method).toBe("PATCH");
    expect(new URL(received[0].request.url).pathname).toBe(
      "/api/videos/7/visibility",
    );
    expect(received[0].body).toEqual({ visibility: "PRIVATE" });
  });

  it("성공 시 playback·격자 전역 영상 목록 쿼리가 무효화된다 (AC 2)", async () => {
    stubFetch(() => envelopeResponse({ videoId: 7, visibility: "PRIVATE" }));
    const { client, wrapper } = createHarness();
    const playbackKey = getPlaybackQueryKey({ path: { videoId: 7 } });
    const globalVideosKey = getGridGlobalVideosQueryKey({
      path: { gridId: GRID_ID },
    });
    client.setQueryData(playbackKey, { seeded: true });
    client.setQueryData(globalVideosKey, { seeded: true });
    const { result } = renderHook(() => useSetVideoVisibility(), { wrapper });

    act(() => {
      result.current.mutate({ videoId: 7, visibility: "PRIVATE" });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryState(playbackKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(globalVideosKey)?.isInvalidated).toBe(true);
  });

  it("실패(5xx) 시 에러 상태가 되고 무효화가 실행되지 않는다 (AC 5)", async () => {
    stubFetch(() => errorEnvelope(9999, "서버 오류", 500));
    const { client, wrapper } = createHarness();
    const playbackKey = getPlaybackQueryKey({ path: { videoId: 7 } });
    client.setQueryData(playbackKey, { seeded: true });
    const { result } = renderHook(() => useSetVideoVisibility(), { wrapper });

    act(() => {
      result.current.mutate({ videoId: 7, visibility: "PRIVATE" });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(client.getQueryState(playbackKey)?.isInvalidated).toBe(false);
  });

  it("전환 요청이 진행 중이면 재발사를 무시한다 — 동시 PATCH 순서 역전 방지 (AC 2 — codex 리뷰 2)", async () => {
    // PATCH는 영원히 보류 — 첫 요청이 in-flight인 동안 두 번째 mutate가 들어온다
    const received = stubFetch(() => new Promise<Response>(() => {}));
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useSetVideoVisibility(), { wrapper });

    act(() => {
      result.current.mutate({ videoId: 7, visibility: "PRIVATE" });
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    act(() => {
      result.current.mutate({ videoId: 7, visibility: "PUBLIC" });
    });
    // ky의 fetch 디스패치는 마이크로태스크 뒤 — 두 번째 요청이 나갈 시간을 준다
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)));

    expect(received.filter((r) => r.request.method === "PATCH")).toHaveLength(
      1,
    );
  });

  it("가드를 우회하는 mutateAsync는 노출되지 않는다 (PR #62 리뷰 2)", () => {
    stubFetch(() => envelopeResponse(null));
    const { wrapper } = createHarness();

    const { result } = renderHook(() => useSetVideoVisibility(), { wrapper });

    expect("mutateAsync" in result.current).toBe(false);
    // @ts-expect-error 반환 타입에서도 제외 — 컴파일 레벨 오용 차단
    void result.current.mutateAsync;
  });
});

describe("useDeleteVideo — 영상 삭제 (AC 4·5)", () => {
  it("삭제 확정 시 DELETE /api/videos/{videoId}가 발사된다 — vitest 전용 판정 (AC 4)", async () => {
    const received = stubFetch(() => envelopeResponse(null));
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useDeleteVideo(), { wrapper });

    act(() => {
      result.current.mutate({ videoId: 7, gridId: GRID_ID });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(received).toHaveLength(1);
    expect(received[0].request.method).toBe("DELETE");
    expect(new URL(received[0].request.url).pathname).toBe("/api/videos/7");
  });

  it("성공 시 도감 쿼리(summary·grids·region-videos·수집률 stats)와 격자 쿼리 세트가 무효화되고 onDeleted가 불린다 (AC 4)", async () => {
    stubFetch(() => envelopeResponse(null));
    const { client, wrapper } = createHarness();
    const seededKeys = [
      getSummaryQueryKey(),
      getCollectionGridsQueryKey(),
      getRegionVideosQueryKey({ query: { regionCode: "2644056000" } }),
      getStatByPointQueryKey({ query: { lat: 35.1579, lng: 129.0594 } }),
      // invalidateGridQueries 대상 대표 — 격자 내 영상 목록 (gridId 정확 무효화)
      getGridVideosQueryKey({ path: { gridId: GRID_ID } }),
    ] as const;
    for (const key of seededKeys) client.setQueryData(key, { seeded: true });
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useDeleteVideo({ onDeleted }), {
      wrapper,
    });

    act(() => {
      result.current.mutate({ videoId: 7, gridId: GRID_ID });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    for (const key of seededKeys) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    }
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("실패 시 무효화·onDeleted가 실행되지 않고 onError가 불린다 (AC 5)", async () => {
    stubFetch(() => errorEnvelope(9999, "서버 오류", 500));
    const { client, wrapper } = createHarness();
    const summaryKey = getSummaryQueryKey();
    client.setQueryData(summaryKey, { seeded: true });
    const onDeleted = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(
      () => useDeleteVideo({ onDeleted, onError }),
      { wrapper },
    );

    act(() => {
      result.current.mutate({ videoId: 7, gridId: GRID_ID });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(client.getQueryState(summaryKey)?.isInvalidated).toBe(false);
    expect(onDeleted).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("gridId 미상(null)이어도 격자 쿼리 세트가 광역 무효화된다 — 미니 패널 빠른 확정 (AC 4 — codex 리뷰 4)", async () => {
    stubFetch(() => envelopeResponse(null));
    const { client, wrapper } = createHarness();
    // 어느 격자의 영상이었는지 모르는 상황 — 특정 gridId 캐시가 남아 있으면 전부 재조회 대상
    const gridVideosKey = getGridVideosQueryKey({ path: { gridId: GRID_ID } });
    const globalVideosKey = getGridGlobalVideosQueryKey({
      path: { gridId: GRID_ID },
    });
    client.setQueryData(gridVideosKey, { seeded: true });
    client.setQueryData(globalVideosKey, { seeded: true });
    const { result } = renderHook(() => useDeleteVideo(), { wrapper });

    act(() => {
      result.current.mutate({ videoId: 7, gridId: null });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryState(gridVideosKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(globalVideosKey)?.isInvalidated).toBe(true);
  });

  /** 미니 패널 선택 픽스처 — FeedVideo 최소 형태 */
  const miniVideo = (videoId: number) => ({
    videoId,
    thumbnailUrl: null,
    durationSec: 84,
    viewCount: null,
    recordedAt: "2026-08-14T00:00:00Z",
  });

  it("삭제한 영상이 미니 패널에 열려 있으면 패널 선택을 닫고 playback 캐시를 제거한다 (codex 리뷰 3)", async () => {
    stubFetch(() => envelopeResponse(null));
    const { client, wrapper } = createHarness();
    const playbackKey = getPlaybackQueryKey({ path: { videoId: 7 } });
    client.setQueryData(playbackKey, { seeded: true });
    useVideoMiniPanelStore.getState().open(miniVideo(7), true);
    const { result } = renderHook(() => useDeleteVideo(), { wrapper });

    act(() => {
      result.current.mutate({ videoId: 7, gridId: GRID_ID });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(useVideoMiniPanelStore.getState().selected).toBeNull();
    expect(client.getQueryState(playbackKey)).toBeUndefined();
  });

  it("다른 영상이 미니 패널에 열려 있으면 패널 선택을 유지한다 (codex 리뷰 3 경계)", async () => {
    stubFetch(() => envelopeResponse(null));
    const { wrapper } = createHarness();
    useVideoMiniPanelStore.getState().open(miniVideo(8), true);
    const { result } = renderHook(() => useDeleteVideo(), { wrapper });

    act(() => {
      result.current.mutate({ videoId: 7, gridId: GRID_ID });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(useVideoMiniPanelStore.getState().selected?.video.videoId).toBe(8);
  });
});

describe("useReportVideo — 신고 실발사 (AC 6·8)", () => {
  it("신고 제출 시 POST /api/videos/{videoId}/reports가 서버 enum reason body로 발사된다 (AC 6)", async () => {
    const received = stubFetch(() =>
      envelopeResponse({ reportId: 1, status: "PENDING" }),
    );
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useReportVideo(), { wrapper });

    act(() => {
      result.current.mutate({ videoId: 7, reasonId: "content" });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(received).toHaveLength(1);
    expect(received[0].request.method).toBe("POST");
    expect(new URL(received[0].request.url).pathname).toBe(
      "/api/videos/7/reports",
    );
    expect(received[0].body).toEqual({ reason: "INAPPROPRIATE" });
  });

  it("중복 신고 응답(HTTP 409 · developCode 11409)은 '이미 신고' 분기로 판정된다 (AC 8)", async () => {
    stubFetch(() => errorEnvelope(11409, "이미 신고한 영상입니다.", 409));
    const { wrapper } = createHarness();
    const onFailed = vi.fn();
    const { result } = renderHook(() => useReportVideo({ onFailed }), {
      wrapper,
    });

    act(() => {
      result.current.mutate({ videoId: 7, reasonId: "spam" });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onFailed).toHaveBeenCalledTimes(1);
    const notice = reportFailureNotice(onFailed.mock.calls[0][0]);
    expect(notice.shouldClose).toBe(true);
    expect(notice.message).toContain("이미 신고한 영상");
  });
});
