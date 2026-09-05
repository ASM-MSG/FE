import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EventVideoCommentPageResponseDto } from "@/shared/api/generated/types.gen";
import { envelopeResponse } from "@/test/envelope-response";
import { eventComment } from "@/test/event-video-fixture";
import { stubFetch } from "@/test/stub-fetch";
import { useEventCommentsPages } from "./use-event-comments-pages";

/**
 * 댓글 페이지 로컬 축적 훅 (MSG-520 AC 7) — 상세 내장 첫 페이지 + getComments 커서
 * 이어붙이기. 병합·커서 판정 값 자체는 event-video-view 순수 테스트가 촘촘히 덮는다.
 */
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const FIRST_PAGE: EventVideoCommentPageResponseDto = {
  comments: [eventComment(1), eventComment(2)],
  hasNext: true,
  nextCursor: "CUR-1",
};

describe("useEventCommentsPages — 첫 페이지 + 더 보기 이어붙이기 (AC 7)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("상세 내장 첫 페이지가 그대로 목록이고 hasNext가 '더 보기' 신호다 (AC 7)", () => {
    const { result } = renderHook(() => useEventCommentsPages(42, FIRST_PAGE), {
      wrapper,
    });

    expect(result.current.comments.map((c) => c.commentId)).toEqual([1, 2]);
    expect(result.current.hasNext).toBe(true);
  });

  it("loadMore가 nextCursor로 다음 페이지를 받아 아래에 잇는다 (AC 7)", async () => {
    const received = stubFetch(async () =>
      envelopeResponse({
        comments: [eventComment(3)],
        hasNext: false,
        nextCursor: null,
      }),
    );
    const { result } = renderHook(() => useEventCommentsPages(42, FIRST_PAGE), {
      wrapper,
    });

    act(() => result.current.loadMore());

    await waitFor(() =>
      expect(result.current.comments.map((c) => c.commentId)).toEqual([
        1, 2, 3,
      ]),
    );
    expect(result.current.hasNext).toBe(false);
    expect(new URL(received[0].request.url).searchParams.get("cursor")).toBe(
      "CUR-1",
    );
  });

  it("hasNext=false면 loadMore가 요청을 보내지 않는다 (경계)", () => {
    const received = stubFetch(async () =>
      envelopeResponse({ comments: [], hasNext: false, nextCursor: null }),
    );
    const { result } = renderHook(
      () =>
        useEventCommentsPages(42, {
          comments: [eventComment(1)],
          hasNext: false,
          nextCursor: null,
        }),
      { wrapper },
    );

    act(() => result.current.loadMore());

    expect(received).toHaveLength(0);
  });

  it("영상이 교체되면 축적한 추가 페이지가 리셋된다 (AC 2 연동)", async () => {
    stubFetch(async () =>
      envelopeResponse({
        comments: [eventComment(3)],
        hasNext: false,
        nextCursor: null,
      }),
    );
    const { result, rerender } = renderHook(
      ({ videoId }: { videoId: number }) =>
        useEventCommentsPages(videoId, FIRST_PAGE),
      { wrapper, initialProps: { videoId: 42 } },
    );
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.comments).toHaveLength(3));

    rerender({ videoId: 43 });

    expect(result.current.comments.map((c) => c.commentId)).toEqual([1, 2]);
  });

  it("이어받기 실패는 onLoadError로 알리고 목록은 유지된다 (AC 9)", async () => {
    stubFetch(async () => new Response("boom", { status: 500 }));
    const onLoadError = vi.fn();
    const { result } = renderHook(
      () => useEventCommentsPages(42, FIRST_PAGE, onLoadError),
      { wrapper },
    );

    act(() => result.current.loadMore());

    await waitFor(() => expect(onLoadError).toHaveBeenCalledTimes(1));
    expect(result.current.comments).toHaveLength(2);
    expect(result.current.isLoadingMore).toBe(false);
  });
});
