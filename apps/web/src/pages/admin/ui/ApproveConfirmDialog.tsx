import { DialogShell, ModalCard } from "@fillmap/ui-web";

interface ApproveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
}

/** 티켓·Figma 명시 문구 — 승인이 즉시 유저 노출임을 확정 직전에 재고지한다 (AC 8) */
const TITLE = "이 행사를 승인할까요?";
const GUIDE =
  "승인하면 기존 행사방 데이터가 생성되고 일반 유저 지도에 즉시 노출됩니다.";

/**
 * 승인 확인 모달 (AC 8) — DialogShell + ModalCard 관례(`UnpublishDialog` 선례).
 * Figma는 이 카드를 지도 우하단에 그려 두었으나 **중앙 DialogShell로 낸다**(승인 확정
 * 질문 7 — 배치는 연출로 판정, 문구는 시안 그대로). 확정 중에는 재클릭이 막힌다.
 */
export const ApproveConfirmDialog = ({
  open,
  onOpenChange,
  isPending,
  onConfirm,
}: ApproveConfirmDialogProps) => (
  <DialogShell open={open} onOpenChange={onOpenChange} srTitle="행사 승인 확인">
    <ModalCard
      title={TITLE}
      description={GUIDE}
      cancelText="취소"
      confirmText="승인·지도 노출"
      confirmDisabled={isPending}
      onCancel={() => onOpenChange(false)}
      onConfirm={onConfirm}
      onClose={() => onOpenChange(false)}
    />
  </DialogShell>
);
