import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLocationVideosInfiniteQueryKey,
  getVideoDetailQueryKey,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import type { ApiResponseDtoEventVideoDetailResponseDto } from "@/shared/api/generated/types.gen";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { EVENT_VIDEO_DETAIL, eventComment } from "@/test/event-video-fixture";
import { stubFetch } from "@/test/stub-fetch";
import {
  useCreateComment,
  useToggleHelpful,
} from "./use-event-video-mutations";

/**
 * 행사 영상 뮤테이션 훅 (MSG-520 AC 5·8·9·12) — 비낙관 seed 계약:
 * 상세 캐시는 invalidate가 아니라 setQueryData로만 갱신된다(재조회 = 조회수 부작용),
 * 위치 영상 목록만 무효화 재조회로 동기화한다.
 */
const DETAIL_KEY = getVideoDetailQueryKey({ path: { videoId: 42 } });
const LIST_KEY = getLocationVideosInfiniteQueryKey({
  path: { occurrenceId: 7, locationId: 4 },
});

const detailEnvelope = (): ApiResponseDtoEventVideoDetailResponseDto => ({
  developCode: 0,
  message: "ok",
  data: structuredClone(EVENT_VIDEO_DETAIL),
});

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // 상세가 이미 열려 있는 상황 — seed 대상 캐시
  queryClient.setQueryData(DETAIL_KEY, detailEnvelope());
  // 위치 영상 목록 캐시 — 무효화 관찰 대상 (AC 12)
  queryClient.setQueryData(LIST_KEY, { pages: [], pageParams: [] });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

const detailData = (queryClient: QueryClient) =>
  queryClient.getQueryData<ApiResponseDtoEventVideoDetailResponseDto>(
    DETAIL_KEY,
  )?.data;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useToggleHelpful — 도움돼요 토글 비낙관 seed (AC 5·12)", () => {
  it("미누름 상태 토글은 PUT이고 응답 helpfulCount·helpfulByMe가 상세 캐시에 seed된다 (AC 5)", async () => {
    const received = stubFetch(async () =>
      envelopeResponse({ helpfulCount: 19, helpfulByMe: true }),
    );
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useToggleHelpful(), { wrapper });

    result.current.mutate({ videoId: 42, helpfulByMe: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(received[0].request.method).toBe("PUT");
    expect(detailData(queryClient)?.helpfulCount).toBe(19);
    expect(detailData(queryClient)?.helpfulByMe).toBe(true);
  });

  it("누른 상태 토글은 DELETE다 — 멱등 취소 (AC 5)", async () => {
    const received = stubFetch(async () =>
      envelopeResponse({ helpfulCount: 18, helpfulByMe: false }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(() => useToggleHelpful(), { wrapper });

    result.current.mutate({ videoId: 42, helpfulByMe: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(received[0].request.method).toBe("DELETE");
  });

  it("성공 시 위치 영상 목록 캐시가 무효화된다 — 카드 '♥ N' 동기화 (AC 12)", async () => {
    stubFetch(async () =>
      envelopeResponse({ helpfulCount: 19, helpfulByMe: true }),
    );
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useToggleHelpful(), { wrapper });

    result.current.mutate({ videoId: 42, helpfulByMe: false });

    await waitFor(() =>
      expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true),
    );
    // 상세는 무효화되지 않는다 — 재조회가 조회수를 올린다 (스펙 리스크)
    expect(queryClient.getQueryState(DETAIL_KEY)?.isInvalidated).toBe(false);
  });

  it("실패 시 캐시를 건드리지 않고 onError로 알린다 (AC 9)", async () => {
    stubFetch(async () => errorEnvelope(13422, "archived", 409));
    const onError = vi.fn();
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useToggleHelpful({ onError }), {
      wrapper,
    });

    result.current.mutate({ videoId: 42, helpfulByMe: false });

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(detailData(queryClient)?.helpfulCount).toBe(18);
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(false);
  });
});

describe("useCreateComment — 댓글 작성 append seed (AC 8·12)", () => {
  it("성공 시 새 댓글이 상세 캐시 목록 맨 아래에 붙고 commentCount가 +1 된다 (AC 8)", async () => {
    const received = stubFetch(async () =>
      envelopeResponse(eventComment(3, { content: "불꽃 미쳤다" })),
    );
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useCreateComment(), { wrapper });

    result.current.mutate({ videoId: 42, content: "불꽃 미쳤다" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(received[0].body).toEqual({ content: "불꽃 미쳤다" });
    const data = detailData(queryClient);
    expect(data?.commentCount).toBe(3);
    expect(data?.comments.comments.map((c) => c.commentId)).toEqual([1, 2, 3]);
  });

  it("성공 시 onCreated가 불리고 위치 영상 목록이 무효화된다 (AC 8·12)", async () => {
    stubFetch(async () => envelopeResponse(eventComment(3)));
    const onCreated = vi.fn();
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useCreateComment({ onCreated }), {
      wrapper,
    });

    result.current.mutate({ videoId: 42, content: "댓글" });

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(DETAIL_KEY)?.isInvalidated).toBe(false);
  });

  it("실패 시 목록·카운트를 건드리지 않고 onError로 알린다 (AC 9)", async () => {
    stubFetch(async () => errorEnvelope(13406, "gone", 404));
    const onError = vi.fn();
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useCreateComment({ onError }), {
      wrapper,
    });

    result.current.mutate({ videoId: 42, content: "댓글" });

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(detailData(queryClient)?.commentCount).toBe(2);
  });
});
