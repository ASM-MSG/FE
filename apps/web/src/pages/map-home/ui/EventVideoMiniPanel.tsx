import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, MoreHorizontal, X } from "lucide-react";
import { Toast } from "@fillmap/ui-web";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import {
  useCreateComment,
  useToggleHelpful,
} from "@/features/event/api/use-event-video-mutations";
import {
  canSubmitComment,
  eventInteractionErrorMessage,
  eventVideoMetaLine,
  eventVideoTitle,
  type PlaybackRate,
  trimmedCommentContent,
} from "@/features/event/model/event-video-view";
import { useEventCommentsPages } from "@/features/event/model/use-event-comments-pages";
import { useEventVideoDetailQuery } from "@/features/event/model/use-event-video-detail-query";
import { useAutoDismissToast } from "@/features/video-actions/model/use-auto-dismiss-toast";
import { VideoPlaybackSurface } from "@/widgets/video-mini-panel/VideoPlaybackSurface";
import { EventVideoCommentInput } from "./EventVideoCommentInput";
import { EventVideoComments } from "./EventVideoComments";
import { EventVideoUtilityMenu } from "./EventVideoUtilityMenu";

interface EventVideoMiniPanelProps {
  /** 선택된 행사 영상 id (event-room-store.videoId) */
  videoId: number;
  /** 닫기 배선 — Escape 우선 닫기는 스토어 back() 3단이 소유 (AC 3) */
  onClose: () => void;
}

/**
 * 행사 영상 미니 패널 (MSG-520 AC 1~10·13) — Figma 15618:2924. 좌측 패널 오른쪽
 * (left-97, 기존 미니 패널과 같은 자리)에 열리는 전고 보조 패널.
 * 재생 표면은 기존 패널과 공유(`VideoPlaybackSurface` — AC 1·11)하고, 그 위에 행사
 * 전용 도움돼요·댓글을 얹는다. 상세(`getVideoDetail`)가 재생 URL·메타·helpful·댓글
 * 첫 페이지를 한 번에 준다.
 * - 조회수는 미표시 — 상세 DTO에 viewCount가 없다 (스펙 오탐 방지 ①).
 * - "댓글 N" pill은 표시 전용 비버튼 (추정 3), 도움돼요만 버튼 (AC 5).
 * - 비로그인 상호작용은 요청 없이 로그인 모달 (AC 6), interactionLocked면 입력
 *   비활성 — 유예 기간(UPLOAD_GRACE) 판정 주체는 서버 필드다 (AC 10, MSG-519 선례).
 * - 실패는 사용자 언어 토스트, 재생 중 영상은 끊지 않는다 (AC 9 — 비낙관 seed라
 *   상세 캐시·video 엘리먼트가 그대로다).
 * 열릴 때(마운트) 포커스를 닫기 버튼으로 옮기고, 카드 교체(리렌더)에는 옮기지
 * 않는다 (기존 패널 관례).
 */
export const EventVideoMiniPanel = ({
  videoId,
  onClose,
}: EventVideoMiniPanelProps) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const [toastMessage, setToastMessage] = useAutoDismissToast();

  const { detail, isPending, isError, retry } =
    useEventVideoDetailQuery(videoId);
  const src = detail?.playbackUrl ?? null;

  // 댓글 입력 초안 — 카드 교체 시 리셋 (렌더 중 상태 조정, use-event-comments-pages 동형)
  const [draftState, setDraftState] = useState({ videoId, text: "" });
  if (draftState.videoId !== videoId) {
    setDraftState({ videoId, text: "" });
  }
  const draft = draftState.videoId === videoId ? draftState.text : "";
  const setDraft = (text: string) => setDraftState({ videoId, text });

  // 재생 속도 (AC 13) — 소스 교체(load)가 playbackRate를 defaultPlaybackRate로
  // 되돌리므로 둘 다 맞춰 두고, src 도착·교체 후에도 재적용한다
  const [rate, setRate] = useState<PlaybackRate>(1);
  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;
    video.playbackRate = rate;
    video.defaultPlaybackRate = rate;
  }, [rate, src]);

  const showError = (error: unknown) =>
    setToastMessage(eventInteractionErrorMessage(error));
  const toggleHelpful = useToggleHelpful({ onError: showError });
  const createComment = useCreateComment({
    onCreated: () => setDraft(""),
    onError: showError,
  });
  const commentsPages = useEventCommentsPages(
    videoId,
    detail?.comments,
    showError,
  );

  // 열림 = 마운트 1회 — 닫기 버튼 포커스. 교체는 같은 마운트의 리렌더라 옮기지 않는다
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleHelpful = () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (detail === null || detail.interactionLocked || toggleHelpful.isPending)
      return;
    toggleHelpful.mutate({ videoId, helpfulByMe: detail.helpfulByMe });
  };

  const handleSubmitComment = () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (detail === null || detail.interactionLocked) return;
    if (!canSubmitComment(draft) || createComment.isPending) return;
    createComment.mutate({ videoId, content: trimmedCommentContent(draft) });
  };

  return (
    <aside
      aria-label="행사 영상 미니 패널"
      className="pointer-events-auto absolute inset-y-0 left-97 z-10 flex w-97 flex-col gap-sm border-l border-border bg-background p-md shadow-raised"
    >
      <div className="flex shrink-0 justify-end gap-xxs">
        {/* 헤더 더보기 (AC 13, 확정 결정 2) — 재생 유틸리티만: 다운로드·재생 속도·PIP */}
        <EventVideoUtilityMenu
          src={src}
          videoRef={videoRef}
          rate={rate}
          onRateChange={setRate}
        >
          <button
            type="button"
            aria-label="영상 더보기"
            className="flex size-8 items-center justify-center rounded-sm text-foreground-muted hover:bg-surface"
          >
            <MoreHorizontal aria-hidden className="size-5" />
          </button>
        </EventVideoUtilityMenu>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="미니 패널 닫기"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-sm text-foreground-muted hover:bg-surface"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>

      {/* 재생 영역 — 기존 패널과 같은 공유 표면 (AC 1). 행사 상세는 playbackUrl이
          항상 있어 불가 문구 분기는 쓰지 않는다 */}
      <div className="shrink-0">
        <VideoPlaybackSurface
          src={src}
          isPending={isPending}
          isError={isError}
          onRetry={retry}
          videoRef={videoRef}
        />
      </div>

      {detail !== null && (
        <>
          <div className="flex shrink-0 flex-col gap-xxs">
            <h2 className="text-fm-title text-foreground">
              {eventVideoTitle(detail)}
            </h2>
            {/* 조회수 미표시 — DTO 부재 (스펙 오탐 방지 ①) */}
            <span className="text-fm-caption text-foreground-muted">
              {eventVideoMetaLine(detail.uploaderNickname, detail.createdAt)}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-xs">
            <button
              type="button"
              aria-pressed={detail.helpfulByMe}
              disabled={detail.interactionLocked}
              onClick={handleHelpful}
              className="flex items-center gap-xxs rounded-full border border-border px-sm py-1 text-fm-caption text-foreground-muted aria-pressed:border-primary aria-pressed:text-primary disabled:opacity-50"
            >
              <Heart
                aria-hidden
                className={`size-4 ${detail.helpfulByMe ? "fill-current" : ""}`}
              />
              도움돼요 {detail.helpfulCount}
            </button>
            {/* 표시 전용 pill (추정 3) — 클릭 동작 정의 부재로 비버튼 */}
            <span className="flex items-center gap-xxs rounded-full border border-border px-sm py-1 text-fm-caption text-foreground-muted">
              <MessageCircle aria-hidden className="size-4" />
              댓글 {detail.commentCount}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <EventVideoComments
              comments={commentsPages.comments}
              hasNext={commentsPages.hasNext}
              loadMore={commentsPages.loadMore}
              isLoadingMore={commentsPages.isLoadingMore}
            />
          </div>

          <EventVideoCommentInput
            value={draft}
            onChange={setDraft}
            onSubmit={handleSubmitComment}
            locked={detail.interactionLocked}
            submitting={createComment.isPending}
            onFocus={(event) => {
              // 비로그인 입력 시도 — 요청 없이 로그인 모달 (AC 6)
              if (!isAuthenticated) {
                event.currentTarget.blur();
                openLoginModal();
              }
            }}
          />
        </>
      )}

      {toastMessage !== null && (
        <div className="fixed inset-x-0 bottom-md z-50 mx-auto w-[calc(100%-2rem)] max-w-120 px-md">
          <Toast title={toastMessage} />
        </div>
      )}
    </aside>
  );
};
