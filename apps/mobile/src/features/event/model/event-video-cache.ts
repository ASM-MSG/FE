import type {
  EventVideoCommentResponseDto,
  EventVideoDetailResponseDto,
  EventVideoHelpfulResponseDto,
} from "../../../shared/api/sdk";

/**
 * 행사 영상 상세 캐시 갱신·잠금 파생 (MSG-562 D6·D7·D9) — 순수 함수.
 * 웹은 `use-event-video-mutations.ts` 안의 비공개 갱신 콜백이지만, 모바일은 훅 렌더
 * 테스트가 없어(vitest.config) seed 규칙을 여기로 내려 단정한다. 상세 캐시는 invalidate 금지
 * (조회수 부작용)라 이 seed가 뮤테이션 결과를 화면에 옮기는 유일한 경로다.
 */

/** 도움돼요 응답 `{helpfulCount, helpfulByMe}`를 상세에 접는다 (AC 4 — 비낙관) */
export const seedHelpful = (
  detail: EventVideoDetailResponseDto,
  response: EventVideoHelpfulResponseDto,
): EventVideoDetailResponseDto => ({
  ...detail,
  helpfulCount: response.helpfulCount,
  helpfulByMe: response.helpfulByMe,
});

/**
 * 작성 응답 댓글을 첫 페이지 맨 아래에 붙이고 commentCount를 +1 한다 (AC 6).
 * 같은 commentId가 이미 있으면 목록은 그대로다(중복 방어 — 웹 동일).
 */
export const appendComment = (
  detail: EventVideoDetailResponseDto,
  comment: EventVideoCommentResponseDto,
): EventVideoDetailResponseDto => ({
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
});

export interface EventVideoInteraction {
  helpfulDisabled: boolean;
  inputDisabled: boolean;
  placeholder: string;
}

/** `interactionLocked`(서버 판정 — FE 날짜 계산 0) → 도움돼요·입력 비활성 + placeholder (AC 7) */
export const eventVideoInteraction = (detail: {
  interactionLocked: boolean;
}): EventVideoInteraction => ({
  helpfulDisabled: detail.interactionLocked,
  inputDisabled: detail.interactionLocked,
  placeholder: detail.interactionLocked
    ? "종료된 행사라 댓글을 남길 수 없어요"
    : "댓글을 입력해주세요",
});
