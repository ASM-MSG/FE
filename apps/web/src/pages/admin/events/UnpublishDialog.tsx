import { useState } from "react";
import { DialogShell, ModalCard } from "@fillmap/ui-web";
import { canSubmitUnpublish } from "@/features/admin-events/model/approved-event";

interface UnpublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 중지 대상 행사명 — 안내 문구에 싣는다 */
  eventTitle: string;
  isPending: boolean;
  /** 실패 안내 — 있으면 모달을 유지한 채 보여 준다 (AC 9) */
  errorMessage: string | null;
  onConfirm: (reason: string) => void;
}

/** 티켓 명시 문구 — 확정 직전 재고지 (AC 7) */
const GUIDE =
  "중지하면 유저 지도와 행사방에서 즉시 사라지며 운영자에게 사유가 통지됩니다.";

/**
 * 노출 중지 사유 모달 (AC 7·8·9) — DialogShell + ModalCard 관례(ReportDialog 선례).
 * Figma에 모달 프레임이 없어 관례로 구현한다(스펙 리스크 — 디자인 대조 비대상).
 * 사유는 로컬 state이며 닫힐 때 초기화된다. 공백뿐인 사유는 확정 불가 —
 * 판정은 `canSubmitUnpublish`(순수)가 소유한다. ui-web에 Textarea가 없어
 * 로컬 textarea다(승격 후보).
 */
export const UnpublishDialog = ({
  open,
  onOpenChange,
  eventTitle,
  isPending,
  errorMessage,
  onConfirm,
}: UnpublishDialogProps) => {
  const [reason, setReason] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) setReason("");
    onOpenChange(next);
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={handleOpenChange}
      srTitle="행사 노출 중지"
    >
      <ModalCard
        title="노출 중지"
        description={`'${eventTitle}'의 노출을 중지합니다. ${GUIDE}`}
        cancelText="취소"
        confirmText="중지 확정"
        confirmVariant="danger"
        confirmDisabled={!canSubmitUnpublish(reason) || isPending}
        onCancel={() => handleOpenChange(false)}
        onConfirm={() => onConfirm(reason)}
        onClose={() => handleOpenChange(false)}
      >
        <div className="flex flex-col gap-xs">
          <label
            htmlFor="unpublish-reason"
            className="text-fm-label text-foreground-body"
          >
            중지 사유
          </label>
          <textarea
            id="unpublish-reason"
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="운영자에게 전달될 사유를 적어 주세요"
            className="resize-none rounded-sm border border-border bg-surface-soft p-sm text-fm-base text-foreground outline-none placeholder:text-foreground-muted focus:border-primary"
          />
          {errorMessage !== null && (
            <p role="alert" className="text-fm-caption text-error">
              {errorMessage}
            </p>
          )}
        </div>
      </ModalCard>
    </DialogShell>
  );
};
