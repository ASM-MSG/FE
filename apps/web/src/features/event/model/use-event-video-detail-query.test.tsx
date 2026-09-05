import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { EVENT_VIDEO_DETAIL } from "@/test/event-video-fixture";
import { stubFetch } from "@/test/stub-fetch";
import { useEventVideoDetailQuery } from "./use-event-video-detail-query";

/**
 * 행사 영상 상세 조회 훅 (MSG-520 AC 1·4) — 언랩 계약 + 실패 계약.
 * 조회수 부작용 억제(자동 재조회 트리거 차단)는 옵션 선언이라 관찰 불가 —
 * 뮤테이션이 invalidate 대신 setQueryData를 쓰는 계약은 use-event-video-mutations
 * 테스트가 고정한다.
 */
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useEventVideoDetailQuery — getVideoDetail 언랩 (AC 1)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("상세 응답을 언랩해 playbackUrl·helpful·댓글 첫 페이지를 돌려준다 (AC 1)", async () => {
    stubFetch(async () => envelopeResponse(EVENT_VIDEO_DETAIL));

    const { result } = renderHook(() => useEventVideoDetailQuery(42), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.detail?.playbackUrl).toBe(
      "https://cdn.example.com/event-42.mp4",
    );
    expect(result.current.detail?.helpfulCount).toBe(18);
    expect(result.current.detail?.comments.comments).toHaveLength(2);
  });

  it("조회 실패면 isError가 서고 retry가 재조회한다", async () => {
    let fail = true;
    stubFetch(async () => {
      if (fail) {
        fail = false;
        return new Response("boom", { status: 500 });
      }
      return envelopeResponse(EVENT_VIDEO_DETAIL);
    });

    const { result } = renderHook(() => useEventVideoDetailQuery(42), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    result.current.retry();

    await waitFor(() => expect(result.current.detail).not.toBeNull());
  });
});
