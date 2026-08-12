import { useState } from "react";
import {
  type ProcessingNotice,
  useProcessingWatcher,
} from "../api/use-processing-watcher";
import { useUploadModalStore } from "../model/upload-modal-store";
import { BlurConfirmModal } from "./BlurConfirmModal";
import { BlurNoticeToast } from "./BlurNoticeToast";

/**
 * 블러 처리 통지 호스트 (MSG-329 B14~B17) — AppLayout 상주.
 * 폴링 워처의 통지를 우하단 토스트 스택으로 띄우고, READY의 [확인하기]는
 * 블러 확인 모달을, FAILED의 [다시 업로드]는 새 업로드 플로우를 연다.
 */
export const UploadProcessingNotices = () => {
  const { notices, dismissNotice } = useProcessingWatcher();
  const openUploadModal = useUploadModalStore((s) => s.openModal);
  const [confirmTarget, setConfirmTarget] = useState<{
    videoId: number;
    playbackUrl: string | null;
  } | null>(null);

  const handleAction = (notice: ProcessingNotice) => {
    if (notice.kind === "ready") {
      setConfirmTarget({
        videoId: notice.videoId,
        playbackUrl: notice.playbackUrl,
      });
    } else if (notice.kind === "failed") {
      // 재업로드 유도 — 새 업로드 플로우 열기 (B17)
      openUploadModal();
    }
    dismissNotice(notice.videoId);
  };

  return (
    <>
      {notices.length > 0 && (
        <div className="fixed bottom-md right-md z-50 flex w-90 max-w-[calc(100%-2rem)] flex-col gap-sm">
          {notices.map((notice) => (
            <BlurNoticeToast
              key={notice.videoId}
              notice={notice}
              onAction={() => handleAction(notice)}
              onDismiss={() => dismissNotice(notice.videoId)}
            />
          ))}
        </div>
      )}

      <BlurConfirmModal
        open={confirmTarget !== null}
        onOpenChange={(next) => {
          if (!next) setConfirmTarget(null);
        }}
        playbackUrl={confirmTarget?.playbackUrl ?? null}
      />
    </>
  );
};
