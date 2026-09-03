import { useState } from "react";
import { useAutoDismissToast } from "../../video-actions/model/use-auto-dismiss-toast";
import type { EventLocationSelection } from "../model/event-location";
import { deactivateEvent, stepBackEvent } from "../model/event-selection";
import {
  eventVideoInteraction,
  type EventVideoInteraction,
} from "../model/event-video-cache";
import {
  canSubmitComment,
  eventInteractionErrorMessage,
  trimmedCommentContent,
} from "../model/event-video-view";
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
  /** 실패 안내 3초 토스트 — null이면 미표시 (D10) */
  toast: string | null;
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
    back: stepBackEvent,
    close: deactivateEvent,
  };
};
