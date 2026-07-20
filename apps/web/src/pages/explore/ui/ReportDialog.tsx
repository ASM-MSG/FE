import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { ModalCard, Toast } from "@fillmap/ui-web";
import {
  canSubmitReport,
  submitReport,
} from "@/features/explore/model/report";
import { ReportReasonSelect } from "./ReportReasonSelect";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REPORT_GUIDE =
  "이 영상을 신고하는 이유를 선택해주세요. 신고는 익명으로 처리됩니다.";
const TOAST_MESSAGE = "신고가 접수되었습니다.";
const TOAST_DURATION_MS = 3000;

/**
 * 영상 신고 모달 — Radix Dialog(오버레이·포털·포커스 트랩)로 ModalCard를 감싼다.
 * 사유 선택 상태는 로컬 state이며 닫힐 때 초기화된다(S9).
 * 취소/✕/바깥 클릭/Escape는 닫기만(제출 안 함) — S8. 제출 시 목업 호출 후 토스트 + 닫기 — S7.
 * 토스트 호스트 인프라가 없어 로컬 setTimeout 자동 소멸로 처리한다(R2).
 */
export const ReportDialog = ({ open, onOpenChange }: ReportDialogProps) => {
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  // 닫힐 때 선택 상태를 초기화해 다시 열면 제출 버튼이 비활성으로 돌아온다 (S9)
  const handleOpenChange = (next: boolean) => {
    if (!next) setReasonId(null);
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!canSubmitReport(reasonId)) return;
    await submitReport(reasonId as string);
    handleOpenChange(false);
    setToastVisible(true);
  };

  // 토스트 자동 소멸
  useEffect(() => {
    if (!toastVisible) return;
    const timer = setTimeout(() => setToastVisible(false), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toastVisible]);

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-navy-900/40" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 outline-none"
          >
            <Dialog.Title className="sr-only">영상 신고</Dialog.Title>
            <ModalCard
              title="영상 신고"
              description={REPORT_GUIDE}
              cancelText="취소"
              confirmText="신고"
              confirmDisabled={!canSubmitReport(reasonId)}
              onCancel={() => handleOpenChange(false)}
              onConfirm={handleSubmit}
              onClose={() => handleOpenChange(false)}
            >
              <ReportReasonSelect value={reasonId} onValueChange={setReasonId} />
            </ModalCard>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {toastVisible && (
        <div className="fixed inset-x-0 bottom-md z-50 mx-auto w-[calc(100%-2rem)] max-w-[480px] px-md">
          <Toast title={TOAST_MESSAGE} />
        </div>
      )}
    </>
  );
};
