import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import type { EventLocationVideoResponseDto } from "@/shared/api/generated/types.gen";
import {
  flattenLocationVideoPages,
  nextLocationVideosPageParam,
  useLocationVideosQuery,
} from "./use-location-videos-query";

/**
 * 위치별 영상 피드 훅 (MSG-518) — 커서 페이지 이어받기.
 * 스텁이 커서 계약을 강제한다: 첫 페이지는 cursor 없이(빈 문자열 `cursor=`도 400 —
 * explore-regions 선례 실측 함정), 다음 페이지는 `cursor=nextCursor` 그대로.
 */
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const video = (videoId: number): EventLocationVideoResponseDto => ({
  videoId,
  thumbnailUrl: `https://cdn.example.com/thumb-${videoId}.jpg`,
  durationSec: 24,
  createdAt: "2026-08-31T10:00:00+09:00",
  helpfulCount: 18,
  commentCount: 6,
});

const PAGE_1 = {
  videos: [video(1), video(2)],
  hasNext: true,
  nextCursor: "CUR-1",
};
const PAGE_2 = { videos: [video(3)], hasNext: false, nextCursor: null };
const EMPTY_PAGE = { videos: [], hasNext: false, nextCursor: null };

const TARGET = { occurrenceId: 7, locationId: 4 };

/** 커서 계약 강제 스텁 — 계약 밖 커서(빈 문자열 포함)는 서버처럼 400으로 거부한다 */
const stubCursorPages = () =>
  stubFetch(async (request: Request) => {
    const cursor = new URL(request.url).searchParams.get("cursor");
    if (cursor === null) return envelopeResponse(PAGE_1);
    if (cursor === "CUR-1") return envelopeResponse(PAGE_2);
    return new Response("bad cursor", { status: 400 });
  });

const envelope = <T,>(data: T) => ({ developCode: 0, message: "ok", data });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("nextLocationVideosPageParam — 커서 파생 (AC 10)", () => {
  it("hasNext가 true면 nextCursor를 그대로 다음 커서로 쓴다 (AC 10)", () => {
    expect(nextLocationVideosPageParam(envelope(PAGE_1))).toBe("CUR-1");
  });

  it("hasNext가 false면 undefined로 중단한다 (AC 10)", () => {
    expect(nextLocationVideosPageParam(envelope(PAGE_2))).toBeUndefined();
  });
});

describe("flattenLocationVideoPages — 페이지 평탄화 (AC 5)", () => {
  it("응답(최신순) 순서를 보존하며 페이지를 이어 붙인다 (AC 5)", () => {
    const flattened = flattenLocationVideoPages([
      envelope(PAGE_1),
      envelope(PAGE_2),
    ]);

    expect(flattened.map((v) => v.videoId)).toEqual([1, 2, 3]);
  });

  it("페이지 미도착(undefined)이면 빈 배열이다 (경계)", () => {
    expect(flattenLocationVideoPages(undefined)).toEqual([]);
  });
});

describe("useLocationVideosQuery — 위치별 영상 피드 (AC 5·7·8·10)", () => {
  it("비로그인에서도 첫 페이지를 cursor 없이 조회하고 영상 존재 판정이 선다 (AC 5·8)", async () => {
    const received = stubCursorPages();
    signOutForTest();

    const { result } = renderHook(() => useLocationVideosQuery(TARGET), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.videos?.map((v) => v.videoId)).toEqual([1, 2]),
    );
    expect(received).toHaveLength(1);
    expect(result.current.hasLocationVideos).toBe(true);
    expect(result.current.hasNext).toBe(true);
  });

  it("첫 페이지 영상 0개면 실패가 아니라 빈 위치 판정이다 (AC 7)", async () => {
    stubFetch(async () => envelopeResponse(EMPTY_PAGE));

    const { result } = renderHook(() => useLocationVideosQuery(TARGET), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.hasLocationVideos).toBe(false);
    expect(result.current.videos).toEqual([]);
  });

  it("loadMore가 cursor=nextCursor로 다음 페이지를 기존 목록 뒤에 이어 붙인다 (AC 10)", async () => {
    stubCursorPages();

    const { result } = renderHook(() => useLocationVideosQuery(TARGET), {
      wrapper,
    });
    await waitFor(() => expect(result.current.videos).toHaveLength(2));

    act(() => result.current.loadMore());

    await waitFor(() =>
      expect(result.current.videos?.map((v) => v.videoId)).toEqual([1, 2, 3]),
    );
    expect(result.current.hasNext).toBe(false);
  });

  it("조회 실패면 isError가 서고 retry가 재조회한다 (AC 8)", async () => {
    let fail = true;
    stubFetch(async () => {
      if (fail) {
        fail = false;
        return new Response("boom", { status: 500 });
      }
      return envelopeResponse(PAGE_1);
    });

    const { result } = renderHook(() => useLocationVideosQuery(TARGET), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.videos).toHaveLength(2));
    expect(result.current.isError).toBe(false);
  });

  it("이어받기 실패는 전면 실패(isError)로 승격되지 않는다 — 받은 목록 유지, 더 보기 재클릭이 곧 재시도 (codex 리뷰 P2)", async () => {
    let failNext = true;
    const received = stubFetch(async (request: Request) => {
      const cursor = new URL(request.url).searchParams.get("cursor");
      if (cursor === null) return envelopeResponse(PAGE_1);
      if (failNext) {
        failNext = false;
        return new Response("boom", { status: 500 });
      }
      return envelopeResponse(PAGE_2);
    });

    const { result } = renderHook(() => useLocationVideosQuery(TARGET), {
      wrapper,
    });
    await waitFor(() => expect(result.current.videos).toHaveLength(2));

    act(() => result.current.loadMore());

    await waitFor(() => expect(received).toHaveLength(2));
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));
    // 전면 에러 승격 금지 — 이미 로드된 목록이 RetryNotice로 교체되면 안 된다
    expect(result.current.isError).toBe(false);
    expect(result.current.videos).toHaveLength(2);
    // 실패 후에도 hasNext가 남아 "더 보기" 버튼이 유지되고, 재클릭이 곧 재시도다
    expect(result.current.hasNext).toBe(true);

    act(() => result.current.loadMore());

    await waitFor(() =>
      expect(result.current.videos?.map((v) => v.videoId)).toEqual([1, 2, 3]),
    );
  });

  it("대상이 null이면(위치 미선택) 요청을 발사하지 않는다 (AC 1 게이트)", async () => {
    const received = stubFetch(async () => envelopeResponse(PAGE_1));

    const { result } = renderHook(() => useLocationVideosQuery(null), {
      wrapper,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toHaveLength(0);
    expect(result.current.isPending).toBe(false);
  });
});
