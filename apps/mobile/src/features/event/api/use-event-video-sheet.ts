import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { EventVideoCommentResponseDto } from "../../../shared/api/sdk";
import { useProfileQuery } from "../../profile/api/use-profile-query";
import type { BlockTarget } from "../../user-block/model/user-block";
import { useAutoDismissToast } from "../../video-actions/model/use-auto-dismiss-toast";
import type { EventLocationSelection } from "../model/event-location";
import { deactivateEvent, stepBackEvent } from "../model/event-selection";
import {
  eventVideoInteraction,
  removeCommentsByAuthor,
  type EventVideoInteraction,
} from "../model/event-video-cache";
import {
  canSubmitComment,
  eventInteractionErrorMessage,
  trimmedCommentContent,
} from "../model/event-video-view";
import { seedDetail } from "./event-video-mutations";
import {
  useEventCommentsPages,
  type EventCommentsPagesResult,
} from "./use-event-comments-pages";
import {
  useEventVideoDetailQuery,
  type EventVideoDetailResult,
} from "./use-event-video-detail-query";
import {
  useCreateComment,
  useToggleHelpful,
} from "./use-event-video-mutations";

/**
 * 현장 영상 상세 시트 배선 훅 (MSG-562 D13) — **뷰-레이어 훅**. 웹 `EventVideoMiniPanel.tsx`가
 * 컴포넌트 안에서 하던 상세·댓글 페이지·뮤테이션·초안·토스트 배선을 시트 콘텐츠 옆으로 뺐다.
 * `use-event-home`은 영상 슬롯만 노출하고 여기가 상세를 소유한다(560에서 +195줄이라 더 얹지 않음).
 * 라우터·지도 SDK를 import하지 않는다.
 */

/** 영상 시트 입력 — `use-event-home`이 선택 슬롯에서 접는다. 이름들은 상세 도착 전 헤더·배지 폴백 */
export interface EventVideoInput {
  videoId: number;
  locationName: string;
  occurrenceTitle: string;
}

/** 영상은 위치 안에서만 선다(`selectEventLocation`이 리셋) — 둘 다 있을 때만 시트 입력이 된다 */
export const videoSheetInput = (
  videoId: number | null,
  location: EventLocationSelection | null,
  occurrenceTitle: string,
): EventVideoInput | null =>
  videoId === null || location === null
    ? null
    : { videoId, locationName: location.name, occurrenceTitle };

export interface EventVideoSheet extends EventVideoDetailResult {
  comments: EventCommentsPagesResult;
  /** 상세 도착 전엔 null — 액션 행·입력 footer는 상세와 함께만 그린다 (웹 게이트 동형) */
  interaction: EventVideoInteraction | null;
  draft: string;
  setDraft: (text: string) => void;
  /** 도움돼요 탭 — 잠금·진행 중(isPending)이면 무시 (D7 비낙관) */
  pressHelpful: () => void;
  helpfulPending: boolean;
  /** 전송 — trim 1~500자 판정 실패·잠금·진행 중이면 무시 (D6) */
  submitComment: () => void;
  submitDisabled: boolean;
  /** 실패·차단 완료 안내 3초 토스트 — null이면 미표시 (D10 · MSG-570) */
  toast: string | null;
  /**
   * 댓글 행 길게 누르기의 차단 대상 (MSG-570 기준 10) — 내 댓글(작성자 닉네임 = getMe 닉네임,
   * A4)은 null이라 행이 눌리지 않는다
   */
  commentBlockTarget: (
    comment: EventVideoCommentResponseDto,
  ) => BlockTarget | null;
  /** 길게 누른 타인 댓글 — "사용자 차단" 1행 액션시트의 대상. null이면 닫힘 */
  commentMenu: BlockTarget | null;
  openCommentMenu: (target: BlockTarget) => void;
  closeCommentMenu: () => void;
  /** 확인 다이얼로그 대상 — 액션시트에서 "사용자 차단"을 고르면 채워진다 */
  blockTarget: BlockTarget | null;
  confirmBlockFromMenu: () => void;
  closeBlockDialog: () => void;
  /** 차단 성공 — 상세 캐시 seed(그 작성자 댓글 제거) + 이어받은 페이지 리셋 + 토스트 (기준 11) */
  onBlocked: (blockedUserId: number) => void;
  /**
   * `‹`·`✕` — `use-event-home`의 `handlers.back/close`와 같은 모듈 액션. 시트 스위치의
   * 접촉면 예산(≤8줄) 때문에 prop 주입 대신 여기서 묶는다 (D11·D13)
   */
  back: () => boolean;
  close: () => void;
}

export const useEventVideoSheet = (videoId: number): EventVideoSheet => {
  const [toast, setToast] = useAutoDismissToast();
  const showError = (error: unknown) =>
    setToast(eventInteractionErrorMessage(error));

  const query = useEventVideoDetailQuery(videoId);
  const { detail } = query;

  // 댓글 입력 초안 — 영상 교체 시 리셋 (렌더 중 상태 조정, use-event-comments-pages 동형)
  const [draftState, setDraftState] = useState({ videoId, text: "" });
  if (draftState.videoId !== videoId) {
    setDraftState({ videoId, text: "" });
  }
  const draft = draftState.videoId === videoId ? draftState.text : "";
  const setDraft = (text: string) => setDraftState({ videoId, text });

  const toggleHelpful = useToggleHelpful({ onError: showError });
  const createComment = useCreateComment({
    // 제출 videoId 대조 — A 전송 중 B로 전환하면 A 완료가 B의 입력을 지우는 레이스 차단
    onCreated: (submittedVideoId) => {
      if (submittedVideoId === videoId) setDraft("");
    },
    onError: showError,
  });
  const comments = useEventCommentsPages(videoId, detail?.comments, showError);

  const interaction = detail === null ? null : eventVideoInteraction(detail);

  // 댓글 작성자 차단 (MSG-570 기준 10·11)
  const queryClient = useQueryClient();
  const { data: me } = useProfileQuery();
  const [commentMenu, setCommentMenu] = useState<BlockTarget | null>(null);
  const [blockTarget, setBlockTarget] = useState<BlockTarget | null>(null);
  const commentBlockTarget = (
    comment: EventVideoCommentResponseDto,
  ): BlockTarget | null =>
    comment.authorNickname === me?.nickname
      ? null
      : { userId: comment.authorId, nickname: comment.authorNickname };
  // 제출한 userId로 처리 — 요청 중 다이얼로그를 닫거나 다른 작성자를 고르면 `blockTarget`은
  // 이미 null·다른 값이다 (codex 리뷰 P2, createComment의 videoId 대조와 같은 레이스 차단)
  const onBlocked = (blockedUserId: number) => {
    setBlockTarget(null);
    // 상세 invalidate 금지(조회수 부작용) — seed + 페이지 리셋으로만 목록에서 뺀다 (A5)
    seedDetail(queryClient, videoId, (previous) =>
      removeCommentsByAuthor(previous, blockedUserId),
    );
    comments.reset();
    setToast("차단했어요");
  };

  const pressHelpful = () => {
    if (detail === null || detail.interactionLocked || toggleHelpful.isPending)
      return;
    toggleHelpful.mutate({ videoId, helpfulByMe: detail.helpfulByMe });
  };

  const submitComment = () => {
    if (detail === null || detail.interactionLocked) return;
    if (!canSubmitComment(draft) || createComment.isPending) return;
    createComment.mutate({ videoId, content: trimmedCommentContent(draft) });
  };

  return {
    ...query,
    comments,
    interaction,
    draft,
    setDraft,
    pressHelpful,
    helpfulPending: toggleHelpful.isPending,
    submitComment,
    submitDisabled:
      (interaction?.inputDisabled ?? true) ||
      createComment.isPending ||
      !canSubmitComment(draft),
    toast,
    commentBlockTarget,
    commentMenu,
    openCommentMenu: setCommentMenu,
    closeCommentMenu: () => setCommentMenu(null),
    blockTarget,
    confirmBlockFromMenu: () => {
      setBlockTarget(commentMenu);
      setCommentMenu(null);
    },
    closeBlockDialog: () => setBlockTarget(null),
    onBlocked,
    back: stepBackEvent,
    close: deactivateEvent,
  };
};
