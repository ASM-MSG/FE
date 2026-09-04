import { DialogShell, ModalCard } from "@fillmap/ui-web";

interface SubmitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  /** 실패 안내 — 있으면 모달을 유지한 채 보여 준다 (AC 11) */
  errorMessage: string | null;
  onConfirm: () => void;
}

/** 확정 직전 재고지 — 시안 부재라 FE 확정 문구다 (스펙 추정 5) */
const GUIDE =
  "최종적으로 제출하시겠습니까? 제출 후에는 심사 중에 내용을 수정할 수 없어요.";

/**
 * 제출 확인 모달 (MSG-548 AC 6·8·11) — DialogShell + ModalCard 관례(UnpublishDialog 선례).
 * Figma에 모달 프레임이 없어 관례로 구현한다(디자인 대조 비대상 — 스펙 리스크 등재).
 *
 * 확인은 파괴적 액션이 아니라 primary다. 진행 중에는 **취소까지 잠근다** —
 * 발사된 요청의 결과를 보여 줄 자리를 잃지 않기 위해서다(중복 제출 방지의 연장, 추정 6).
 * 실패해도 모달을 닫지 않는다: 재시도 동선이 이 자리에 있다.
 */
export const SubmitConfirmDialog = ({
  open,
  onOpenChange,
  isPending,
  errorMessage,
  onConfirm,
}: SubmitConfirmDialogProps) => (
  <DialogShell
    open={open}
    onOpenChange={(next) => {
      // 진행 중에는 Esc·scrim으로도 닫히지 않는다 (AC 8)
      if (isPending) return;
      onOpenChange(next);
    }}
    srTitle="행사 등록 신청 제출"
  >
    <ModalCard
      title="행사 등록 신청 제출"
      description={GUIDE}
      cancelText="취소"
      confirmText={isPending ? "제출 중" : "제출하기"}
      confirmDisabled={isPending}
      onCancel={() => {
        if (isPending) return;
        onOpenChange(false);
      }}
      onConfirm={onConfirm}
    >
      {errorMessage !== null && (
        <p role="alert" className="text-fm-body text-error">
          {errorMessage}
        </p>
      )}
    </ModalCard>
  </DialogShell>
);
