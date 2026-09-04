import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import {
  addHelpfulMutation,
  createCommentMutation,
  getLocationVideosInfiniteQueryKey,
  getVideoDetailQueryKey,
  removeHelpfulMutation,
} from "../../../shared/api/query-options";
import type {
  ApiResponseDtoEventVideoCommentResponseDto,
  ApiResponseDtoEventVideoDetailResponseDto,
  ApiResponseDtoEventVideoHelpfulResponseDto,
  EventVideoDetailResponseDto,
} from "../../../shared/api/sdk";
import { appendComment, seedHelpful } from "../model/event-video-cache";

/**
 * 행사 영상 도움돼요·댓글 뮤테이션 옵션 (MSG-562 D7·D8) — 웹 `use-event-video-mutations.ts`
 * 이식, 전부 비낙관: 멱등 PUT/DELETE·POST 응답(처리 후 재집계 값)을 그대로 캐시에 접는다.
 *
 * **상세 캐시는 invalidate 금지** — `getVideoDetail` 재조회는 서버가 타인 조회수를 올린다.
 * 상세는 `setQueryData` seed로만 갱신하고, 위치 영상 목록(카드 `♥ N · 댓글 M`)만 무효화한다.
 * 무효화 키는 웹의 `_id` 부분 키가 아니라 **정확한 infinite 키 1개** — 상세 DTO가
 * `occurrenceId·locationId`를 갖고 있어 가능하다(D8, `invalidate-event-surfaces` 확정 분기와 동형).
 * 구조는 "옵션 팩토리 + 얇은 훅"(MSG-426) — 테스트는 이 옵션을 `MutationObserver`로 구동한다.
 * 콜백은 옵션 레벨로 받는다 — mutate per-call 콜백은 관찰자 언마운트 시 유실된다(MSG-325).
 */

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const addHelpfulFn = addHelpfulMutation().mutationFn!;
const removeHelpfulFn = removeHelpfulMutation().mutationFn!;
const createCommentFn = createCommentMutation().mutationFn!;

type DetailEnvelope = ApiResponseDtoEventVideoDetailResponseDto;

/**
 * 상세 캐시 seed — 봉투를 유지한 채 data만 갱신하고 갱신된 상세를 돌려준다.
 * 캐시 부재(시트 닫힘 후 gc)면 no-op·undefined.
 */
const seedDetail = (
  queryClient: QueryClient,
  videoId: number,
  update: (detail: EventVideoDetailResponseDto) => EventVideoDetailResponseDto,
): EventVideoDetailResponseDto | undefined => {
  const key = getVideoDetailQueryKey({ path: { videoId } });
  const previous = queryClient.getQueryData<DetailEnvelope>(key);
  if (previous === undefined) return undefined;
  const next = update(previous.data);
  queryClient.setQueryData<DetailEnvelope>(key, { ...previous, data: next });
  return next;
};

/** 위치 영상 목록 정확 키 무효화 (AC 9) — 카드 `♥ N · 댓글 M`이 복귀 시 재조회된다 */
const invalidateLocationVideos = (
  queryClient: QueryClient,
  detail: EventVideoDetailResponseDto,
): void => {
  const [key] = getLocationVideosInfiniteQueryKey({
    path: { occurrenceId: detail.occurrenceId, locationId: detail.locationId },
  });
  void queryClient.invalidateQueries({ queryKey: [key] });
};

export interface ToggleHelpfulInput {
  videoId: number;
  /** 현재 내가 누른 상태 — true면 취소(DELETE), false면 추가(PUT) */
  helpfulByMe: boolean;
}

/**
 * 도움돼요 토글 (AC 4) — `PUT/DELETE /api/event-videos/{videoId}/helpful`.
 * 성공 응답을 상세에 seed하고 위치 목록을 무효화한다. 실패 시 캐시 무접촉, onError만 (AC 8).
 */
export const toggleHelpfulMutationOptions = (
  queryClient: QueryClient,
  callbacks: { onError?: (error: unknown) => void },
): UseMutationOptions<
  ApiResponseDtoEventVideoHelpfulResponseDto,
  Error,
  ToggleHelpfulInput
> => ({
  mutationFn: (input, context) =>
    (input.helpfulByMe ? removeHelpfulFn : addHelpfulFn)(
      { path: { videoId: input.videoId } },
      context,
    ),
  onSuccess: (data, { videoId }) => {
    const response = unwrapEnvelope(data);
    const detail = seedDetail(queryClient, videoId, (previous) =>
      seedHelpful(previous, response),
    );
    if (detail !== undefined) invalidateLocationVideos(queryClient, detail);
  },
  onError: (error) => callbacks.onError?.(error),
});

export interface CreateCommentInput {
  videoId: number;
  /** 전송 본문 — trim 1~500자 판정(canSubmitComment)은 호출부 몫 */
  content: string;
}

/**
 * 댓글 작성 (AC 6) — `POST /api/event-videos/{videoId}/comments`.
 * 성공 시 응답 댓글을 첫 페이지 맨 아래에 append(중복 방어)하고 commentCount +1 seed,
 * 위치 목록 무효화. 입력 비우기는 onCreated 콜백 몫 — 완료 시점에 다른 영상으로 전환됐을 수
 * 있어 호출부가 videoId를 대조한다.
 */
export const createCommentMutationOptions = (
  queryClient: QueryClient,
  callbacks: {
    onCreated?: (videoId: number) => void;
    onError?: (error: unknown) => void;
  },
): UseMutationOptions<
  ApiResponseDtoEventVideoCommentResponseDto,
  Error,
  CreateCommentInput
> => ({
  mutationFn: (input, context) =>
    createCommentFn(
      { path: { videoId: input.videoId }, body: { content: input.content } },
      context,
    ),
  onSuccess: (data, { videoId }) => {
    const comment = unwrapEnvelope(data);
    const detail = seedDetail(queryClient, videoId, (previous) =>
      appendComment(previous, comment),
    );
    if (detail !== undefined) invalidateLocationVideos(queryClient, detail);
    callbacks.onCreated?.(videoId);
  },
  onError: (error) => callbacks.onError?.(error),
});
