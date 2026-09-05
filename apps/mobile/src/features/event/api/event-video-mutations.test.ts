import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiResponseDtoEventVideoDetailResponseDto } from "../../../shared/api/sdk";
import {
  envelopeResponse,
  errorEnvelope,
} from "../../../test/envelope-response";
import {
  EVENT_VIDEO_DETAIL,
  eventComment,
} from "../../../test/event-video-fixture";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 도움돼요 토글·댓글 작성의 요청·seed·무효화·실패 계약
 * (AC 4·6·8·9·10). `renderHook` 없이 실제 `QueryClient` + `MutationObserver`로 훅과
 * **같은 옵션 객체**를 구동한다 (marketing-consent-mutation.test 선례).
 */
const API_BASE = "https://api.test.local";
const VIDEO_ID = 240347;

const loadMutations = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { createCommentMutationOptions, toggleHelpfulMutationOptions } =
    await import("./event-video-mutations");
  const { getVideoDetailQueryKey } =
    await import("../../../shared/api/query-options");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const detailKey = getVideoDetailQueryKey({ path: { videoId: VIDEO_ID } });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  const detailOf = () =>
    queryClient.getQueryData<ApiResponseDtoEventVideoDetailResponseDto>(
      detailKey,
    )?.data;
  const seedDetail = (helpfulByMe = false) =>
    queryClient.setQueryData<ApiResponseDtoEventVideoDetailResponseDto>(
      detailKey,
      {
        developCode: 0,
        message: "ok",
        data: { ...EVENT_VIDEO_DETAIL, helpfulByMe },
      },
    );
  /** 무효화 호출에 실린 키의 첫 원소(생성 키 파라미터)들 */
  const invalidatedKeys = () =>
    invalidate.mock.calls.map((call) => {
      const filters = call[0] as { queryKey: Record<string, unknown>[] };
      return filters.queryKey[0];
    });

  return {
    queryClient,
    detailOf,
    seedDetail,
    invalidatedKeys,
    toggleHelpfulMutationOptions,
    createCommentMutationOptions,
  };
};

/** 요청 스텁 — 메서드·경로·본문을 전송 시점에 기록한다 (auth-pipeline.test 관례) */
const stubFetch = (
  route: (request: Request) => Response | Promise<Response>,
) => {
  const received: Array<{ method: string; pathname: string; body: string }> =
    [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      received.push({
        method: input.method,
        pathname: new URL(input.url).pathname,
        body: input.body === null ? "" : await input.clone().text(),
      });
      return route(input);
    }),
  );
  return received;
};

/** 생성 키의 식별 필드만 — baseUrl 등 클라이언트 내부 필드는 단정하지 않는다 (invalidate-event-surfaces.test 관례) */
const LOCATION_VIDEOS_KEY = {
  _id: "getLocationVideos",
  _infinite: true,
  path: { occurrenceId: 5, locationId: 11 },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("도움돼요 토글 (AC 4·9·10)", () => {
  it("helpfulByMe=false면 PUT /helpful, 응답이 버튼 상태·카운트에 seed되고 상세는 재조회되지 않는다", async () => {
    const {
      queryClient,
      seedDetail,
      detailOf,
      invalidatedKeys,
      toggleHelpfulMutationOptions,
    } = await loadMutations();
    seedDetail(false);
    const received = stubFetch(() =>
      envelopeResponse({ helpfulCount: 2, helpfulByMe: true }),
    );
    const observer = new MutationObserver(
      queryClient,
      toggleHelpfulMutationOptions(queryClient, {}),
    );

    await observer.mutate({ videoId: VIDEO_ID, helpfulByMe: false });

    expect(received).toEqual([
      { method: "PUT", pathname: "/api/event-videos/240347/helpful", body: "" },
    ]);
    expect(detailOf()).toMatchObject({ helpfulCount: 2, helpfulByMe: true });
    expect(detailOf()?.comments).toEqual(EVENT_VIDEO_DETAIL.comments);
    // 위치 영상 목록만 정확 키로 무효화 — 상세 키 무효화 0회 (조회수 부작용)
    expect(invalidatedKeys()).toHaveLength(1);
    expect(invalidatedKeys()[0]).toMatchObject(LOCATION_VIDEOS_KEY);
  });

  it("helpfulByMe=true면 DELETE /helpful로 취소한다 (AC 4)", async () => {
    const { queryClient, seedDetail, detailOf, toggleHelpfulMutationOptions } =
      await loadMutations();
    seedDetail(true);
    const received = stubFetch(() =>
      envelopeResponse({ helpfulCount: 1, helpfulByMe: false }),
    );
    const observer = new MutationObserver(
      queryClient,
      toggleHelpfulMutationOptions(queryClient, {}),
    );

    await observer.mutate({ videoId: VIDEO_ID, helpfulByMe: true });

    expect(received[0].method).toBe("DELETE");
    expect(detailOf()).toMatchObject({ helpfulCount: 1, helpfulByMe: false });
  });

  it("실패하면 캐시를 건드리지 않고 onError에 ApiError(developCode)를 넘긴다 (AC 8)", async () => {
    const {
      queryClient,
      seedDetail,
      detailOf,
      invalidatedKeys,
      toggleHelpfulMutationOptions,
    } = await loadMutations();
    seedDetail(false);
    stubFetch(() => errorEnvelope(13422, "종료된 행사", 409));
    const onError = vi.fn();
    const observer = new MutationObserver(
      queryClient,
      toggleHelpfulMutationOptions(queryClient, { onError }),
    );

    await expect(
      observer.mutate({ videoId: VIDEO_ID, helpfulByMe: false }),
    ).rejects.toThrow();

    expect(detailOf()).toMatchObject({ helpfulCount: 1, helpfulByMe: false });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({ developCode: 13422 });
    expect(invalidatedKeys()).toEqual([]);
  });
});

describe("댓글 작성 (AC 6·9)", () => {
  it("POST /comments {content} 후 응답 댓글이 맨 아래에 붙고 commentCount+1, 목록이 무효화되며 onCreated(videoId)가 불린다", async () => {
    const {
      queryClient,
      seedDetail,
      detailOf,
      invalidatedKeys,
      createCommentMutationOptions,
    } = await loadMutations();
    seedDetail();
    const created = eventComment(3, { content: "MSG-562 검증" });
    const received = stubFetch(() => envelopeResponse(created));
    const onCreated = vi.fn();
    const observer = new MutationObserver(
      queryClient,
      createCommentMutationOptions(queryClient, { onCreated }),
    );

    await observer.mutate({ videoId: VIDEO_ID, content: "MSG-562 검증" });

    expect(received[0].method).toBe("POST");
    expect(received[0].pathname).toBe("/api/event-videos/240347/comments");
    expect(JSON.parse(received[0].body)).toEqual({ content: "MSG-562 검증" });
    expect(detailOf()?.commentCount).toBe(3);
    expect(detailOf()?.comments.comments.map((c) => c.commentId)).toEqual([
      1, 2, 3,
    ]);
    expect(invalidatedKeys()).toHaveLength(1);
    expect(invalidatedKeys()[0]).toMatchObject(LOCATION_VIDEOS_KEY);
    expect(onCreated).toHaveBeenCalledWith(VIDEO_ID);
    // 상세 재조회 0회 — POST 1건뿐 (AC 10)
    expect(received).toHaveLength(1);
  });

  it("같은 commentId가 이미 있으면 두 번 붙이지 않는다 (AC 6 중복 방어)", async () => {
    const { queryClient, seedDetail, detailOf, createCommentMutationOptions } =
      await loadMutations();
    seedDetail();
    stubFetch(() => envelopeResponse(eventComment(2)));
    const observer = new MutationObserver(
      queryClient,
      createCommentMutationOptions(queryClient, {}),
    );

    await observer.mutate({ videoId: VIDEO_ID, content: "다시" });

    expect(detailOf()?.comments.comments.map((c) => c.commentId)).toEqual([
      1, 2,
    ]);
  });

  it("실패하면 캐시·onCreated 무접촉, onError만 부른다 (AC 8)", async () => {
    const { queryClient, seedDetail, detailOf, createCommentMutationOptions } =
      await loadMutations();
    seedDetail();
    stubFetch(() => errorEnvelope(13406, "비노출 영상", 404));
    const onCreated = vi.fn();
    const onError = vi.fn();
    const observer = new MutationObserver(
      queryClient,
      createCommentMutationOptions(queryClient, { onCreated, onError }),
    );

    await expect(
      observer.mutate({ videoId: VIDEO_ID, content: "x" }),
    ).rejects.toThrow();

    expect(detailOf()?.commentCount).toBe(2);
    expect(onCreated).not.toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toMatchObject({ developCode: 13406 });
  });
});
