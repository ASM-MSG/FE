import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
// 생성 mutation 옵션·키는 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  addHelpfulMutation,
  createCommentMutation,
  getLocationVideosQueryKey,
  getVideoDetailQueryKey,
  removeHelpfulMutation,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import type {
  ApiResponseDtoEventVideoDetailResponseDto,
  EventVideoDetailResponseDto,
} from "@/shared/api/generated/types.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";

/**
 * 행사 영상 도움돼요·댓글 뮤테이션 (MSG-520 AC 5·8·12) — 전부 비낙관(스펙 추정 4):
 * 멱등 PUT/DELETE·POST 응답(처리 후 재집계 값)을 그대로 캐시에 반영한다.
 *
 * **상세 캐시는 invalidate 금지(스펙 리스크)** — `getVideoDetail` 재조회는 서버가
 * 타인 조회수를 올린다. 상세는 setQueryData seed로만 갱신하고, 위치 영상 목록
 * (`use-location-videos-query` — 카드 "♥ N · 댓글 M")만 무효화 재조회한다 (AC 12).
 * 콜백은 훅 레벨 옵션으로 받는다 — mutate per-call 콜백은 관찰자 언마운트 시
 * 유실된다(MSG-325 선례).
 */

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const addHelpfulFn = addHelpfulMutation().mutationFn!;
const removeHelpfulFn = removeHelpfulMutation().mutationFn!;
const createCommentFn = createCommentMutation().mutationFn!;

/** 상세 캐시 seed — 봉투를 유지한 채 data만 갱신한다. 캐시 부재(패널 닫힘)면 no-op */
const seedDetail = (
  queryClient: QueryClient,
  videoId: number,
  update: (data: EventVideoDetailResponseDto) => EventVideoDetailResponseDto,
): void => {
  queryClient.setQueryData<ApiResponseDtoEventVideoDetailResponseDto>(
    getVideoDetailQueryKey({ path: { videoId } }),
    (old) =>
      old === undefined ? undefined : { ...old, data: update(old.data) },
  );
};

/**
 * 위치 영상 목록 전 파라미터 무효화 (AC 12) — 생성 키의 식별자(`_id`)만 남긴 부분 키
 * (use-video-mutations invalidateAllOf 관례). infinite 키도 같은 `_id`라 함께 잡힌다.
 */
const invalidateLocationVideos = (queryClient: QueryClient): void => {
  const [key] = getLocationVideosQueryKey({
    path: { occurrenceId: 0, locationId: 0 },
  });
  void queryClient.invalidateQueries({ queryKey: [{ _id: key._id }] });
};

export interface ToggleHelpfulInput {
  videoId: number;
  /** 현재 내가 누른 상태 — true면 취소(DELETE), false면 추가(PUT) */
  helpfulByMe: boolean;
}

/**
 * 도움돼요 토글 (AC 5) — `PUT/DELETE /api/event-videos/{videoId}/helpful`.
 * 성공 응답 `{helpfulCount, helpfulByMe}`를 상세 캐시에 seed하고 위치 목록을
 * 무효화한다. 실패 시 캐시를 건드리지 않고 onError만 부른다 (AC 9).
 */
export const useToggleHelpful = (callbacks?: {
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ToggleHelpfulInput, context) =>
      (input.helpfulByMe ? removeHelpfulFn : addHelpfulFn)(
        { path: { videoId: input.videoId } },
        context,
      ),
    onSuccess: (data, { videoId }) => {
      const { helpfulCount, helpfulByMe } = unwrapEnvelope(data);
      seedDetail(queryClient, videoId, (detail) => ({
        ...detail,
        helpfulCount,
        helpfulByMe,
      }));
      invalidateLocationVideos(queryClient);
    },
    onError: (error) => callbacks?.onError?.(error),
  });
};

export interface CreateCommentInput {
  videoId: number;
  /** 전송 본문 — trim 1~500자 판정(canSubmitComment)은 호출부 몫 */
  content: string;
}

/**
 * 댓글 작성 (AC 8) — `POST /api/event-videos/{videoId}/comments`.
 * 성공 시 응답 댓글을 상세 캐시 내장 페이지 맨 아래에 append(중복 commentId 방어)하고
 * commentCount를 +1 seed, 위치 목록을 무효화한다. 입력 비우기는 onCreated 콜백 몫.
 */
export const useCreateComment = (callbacks?: {
  onCreated?: () => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput, context) =>
      createCommentFn(
        { path: { videoId: input.videoId }, body: { content: input.content } },
        context,
      ),
    onSuccess: (data, { videoId }) => {
      const comment = unwrapEnvelope(data);
      seedDetail(queryClient, videoId, (detail) => ({
        ...detail,
        commentCount: detail.commentCount + 1,
        comments: {
          ...detail.comments,
          comments: detail.comments.comments.some(
            (existing) => existing.commentId === comment.commentId,
          )
            ? detail.comments.comments
            : [...detail.comments.comments, comment],
        },
      }));
      invalidateLocationVideos(queryClient);
      callbacks?.onCreated?.();
    },
    onError: (error) => callbacks?.onError?.(error),
  });
};
