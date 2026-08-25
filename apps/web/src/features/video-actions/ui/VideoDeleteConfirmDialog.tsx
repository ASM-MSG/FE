import { DialogShell, ModalCard, Thumbnail, Toast } from "@fillmap/ui-web";
import { useVideoPlaybackQuery } from "@/features/map-home/model/use-video-playback-query";
import { useDeleteVideo } from "../api/use-video-mutations";
import { useAutoDismissToast } from "../model/use-auto-dismiss-toast";
import {
  deleteCardMeta,
  deleteCardTitle,
  toPlaybackFeedVideo,
  type VideoActionTarget,
  videoCardLabel,
} from "../model/video-menu";

interface VideoDeleteConfirmDialogProps {
  target: VideoActionTarget;
  /** false로만 불린다(취소·✕·Escape·바깥 클릭·삭제 성공) — 부모가 조건 렌더로 연다 */
  onOpenChange: (open: boolean) => void;
}

const DELETE_GUIDE =
  "삭제하면 되돌릴 수 없어요. 이 영상이 채운 격자 기록과 수집 통계에서도 함께 빠집니다.";
const ERROR_MESSAGE = "영상을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.";

/**
 * 영상 삭제 확인 모달 (MSG-411 AC 3~5, Figma 14792:3610) — 제목·비가역 안내·대상 영상
 * 카드(썸네일 · "서면 A-02 · 1:24" · "3일 전 수집 · 전체 공개") + [취소]/[삭제(빨강)].
 * 부모(VideoMoreMenu)가 열릴 때만 마운트한다 — 카드 메타 보강용 단건 재생 조회
 * (구역 라벨·공개 범위·gridId)가 모달이 열려야만 발사되고, 대개 메뉴 오픈 때 캐시돼 있다.
 * 미확보 값은 생략 폴백(추정 7) — 목록 데이터(target)만으로도 모달은 성립한다.
 * 취소·✕·Escape·바깥 클릭은 요청 없이 닫기만, 삭제 확정만 DELETE를 발사한다 (AC 3·4).
 * 실패 시 토스트 + 모달 유지 — 닫힘·무효화가 실행되지 않는다 (AC 5).
 */
export const VideoDeleteConfirmDialog = ({
  target,
  onOpenChange,
}: VideoDeleteConfirmDialogProps) => {
  const [errorMessage, setErrorMessage] = useAutoDismissToast();
  // 목록 응답에 없는 visibility·구역 밖 폴백 라벨·gridId 보강 (스펙 코드 대조)
  const { playback } = useVideoPlaybackQuery(toPlaybackFeedVideo(target));

  // 삭제 성공 후속(열려 있는 미니 패널 닫기·playback 캐시 제거)은 훅이 중앙 처리한다
  const deleteVideo = useDeleteVideo({
    onDeleted: () => onOpenChange(false),
    onError: () => setErrorMessage(ERROR_MESSAGE),
  });

  const zoneName = target.zoneName ?? playback?.zoneName ?? null;
  const zoneCell = target.zoneCell ?? playback?.zoneCell ?? null;
  const label = videoCardLabel(
    zoneName,
    zoneCell,
    playback?.regionName ?? null,
  );
  const thumbnailUrl = target.thumbnailUrl ?? playback?.thumbnailUrl ?? null;
  const gridId = target.gridId ?? playback?.gridId ?? null;

  return (
    <>
      <DialogShell open onOpenChange={onOpenChange} srTitle="영상 삭제 확인">
        <ModalCard
          title="영상을 삭제할까요?"
          description={DELETE_GUIDE}
          cancelText="취소"
          confirmText="삭제"
          confirmDisabled={deleteVideo.isPending}
          confirmVariant="danger"
          onCancel={() => onOpenChange(false)}
          onConfirm={() =>
            deleteVideo.mutate({ videoId: target.videoId, gridId })
          }
          onClose={() => onOpenChange(false)}
        >
          {/* 대상 영상 카드 — Figma 14792:3610 (예시값이 아닌 실데이터 렌더) */}
          <div className="flex items-center gap-sm rounded-md bg-surface p-sm">
            {/* MSG-464: null·로드 에러 모두 카드 4곳과 동일한 기본 이미지 폴백 (기준 6, 추정 5) */}
            <span className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-surface">
              <Thumbnail src={thumbnailUrl} />
            </span>
            <div className="flex min-w-0 flex-col gap-xxs">
              <p className="truncate text-fm-body-strong text-foreground">
                {deleteCardTitle(label, target.durationSec)}
              </p>
              <p className="truncate text-fm-caption text-foreground-muted">
                {deleteCardMeta(target.createdAt, playback?.visibility ?? null)}
              </p>
            </div>
          </div>
        </ModalCard>
      </DialogShell>

      {errorMessage !== null && (
        <div className="fixed inset-x-0 bottom-md z-50 mx-auto w-[calc(100%-2rem)] max-w-120 px-md">
          <Toast title={errorMessage} />
        </div>
      )}
    </>
  );
};
