import { useState } from "react";
import { DialogShell, ModalCard, Toast } from "@fillmap/ui-web";
import { useReportVideo } from "../api/use-video-mutations";
import { canSubmitReport, reportFailureNotice } from "../model/report";
import { useAutoDismissToast } from "../model/use-auto-dismiss-toast";
import { ReportReasonSelect } from "./ReportReasonSelect";

interface ReportDialogProps {
  /** 신고 대상 영상 — `POST /api/videos/{videoId}/reports` 경로 변수 (AC 6) */
  videoId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REPORT_GUIDE =
  "이 영상을 신고하는 이유를 선택해주세요. 신고는 익명으로 처리됩니다.";
/** 신고는 즉시 블라인드가 아니다 — 관리자 승인 시 조치 (AC 7) */
const SUCCESS_MESSAGE = "신고가 접수되었습니다. 검토 후 조치돼요.";

/**
 * 영상 신고 모달 (MSG-116 → MSG-411 실연동 이동) — DialogShell(오버레이·포털·포커스
 * 트랩)로 ModalCard를 감싼다. 사유 선택 상태는 로컬 state이며 닫힐 때 초기화된다(S9).
 * 취소/✕/바깥 클릭/Escape는 닫기만(제출 안 함) — S8.
 * 제출은 실 API 발사(useReportVideo) — 성공 시 접수 토스트 + 닫기(AC 6·7),
 * 중복 신고(11409/409)는 "이미 신고한 영상" 안내 + 닫기, 그 외 실패는 일반 안내 +
 * 모달 유지로 재시도 가능 (AC 8, reportFailureNotice 분기).
 * 토스트 호스트 인프라가 없어 로컬 자동 소멸(useAutoDismissToast)로 처리한다(R2).
 */
export const ReportDialog = ({
  videoId,
  open,
  onOpenChange,
}: ReportDialogProps) => {
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useAutoDismissToast();

  // 닫힐 때 선택 상태를 초기화해 다시 열면 제출 버튼이 비활성으로 돌아온다 (S9)
  const handleOpenChange = (next: boolean) => {
    if (!next) setReasonId(null);
    onOpenChange(next);
  };

  const reportVideo = useReportVideo({
    onReported: () => {
      handleOpenChange(false);
      setToastMessage(SUCCESS_MESSAGE);
    },
    onFailed: (error) => {
      const notice = reportFailureNotice(error);
      if (notice.shouldClose) handleOpenChange(false);
      setToastMessage(notice.message);
    },
  });

  const handleSubmit = () => {
    if (!canSubmitReport(reasonId) || reportVideo.isPending) return;
    reportVideo.mutate({ videoId, reasonId });
  };

  return (
    <>
      <DialogShell
        open={open}
        onOpenChange={handleOpenChange}
        srTitle="영상 신고"
      >
        <ModalCard
          title="영상 신고"
          description={REPORT_GUIDE}
          cancelText="취소"
          confirmText="신고"
          confirmDisabled={!canSubmitReport(reasonId) || reportVideo.isPending}
          confirmVariant="danger"
          onCancel={() => handleOpenChange(false)}
          onConfirm={handleSubmit}
          onClose={() => handleOpenChange(false)}
        >
          <ReportReasonSelect value={reasonId} onValueChange={setReasonId} />
        </ModalCard>
      </DialogShell>

      {toastMessage !== null && (
        <div className="fixed inset-x-0 bottom-md z-50 mx-auto w-[calc(100%-2rem)] max-w-120 px-md">
          <Toast title={toastMessage} />
        </div>
      )}
    </>
  );
};
