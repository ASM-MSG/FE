import { useState } from "react";
import { DialogShell, ModalCard } from "@fillmap/ui-web";
import { canSubmitReason } from "@/features/admin-accounts/model/account-view";

interface RejectReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 모달 제목 — 발급 요청 반려 / 아이디 변경 반려가 공용한다 */
  title: string;
  /** 반려 대상 식별 문구 (기관명·아이디 등) */
  description: string;
  isPending: boolean;
  /** 실패 안내 — 있으면 모달을 유지한 채 보여 준다 */
  errorMessage: string | null;
  onConfirm: (reason: string) => void;
}

/**
 * 반려 사유 모달 (MSG-551 AC 12·13) — 발급 요청 반려와 아이디 변경 반려가 공용한다.
 *
 * **반려 메일은 발송되지 않는다**(서버 doc) — 저장된 사유가 수기 통보 재료라는 사실을
 * 확정 직전에 고지한다. 공백뿐인 사유는 확정 불가 — 판정은 `canSubmitReason`(순수).
 * ui-web에 Textarea가 없어 로컬 textarea다(UnpublishDialog 선례 · 승격 후보).
 */
const MAIL_NOTICE =
  "반려 사유는 메일로 발송되지 않으며 수기 통보 재료로 저장됩니다.";

export const RejectReasonDialog = ({
  open,
  onOpenChange,
  ...body
}: RejectReasonDialogProps) => (
  <DialogShell open={open} onOpenChange={onOpenChange} srTitle={body.title}>
    {/*
     * 사유 상태는 이 본문이 소유한다 — DialogShell(Radix Portal)이 닫힘에서
     * children을 언마운트하므로 다음 열림은 항상 빈 사유로 시작한다.
     * 부모가 open을 직접 내리는 경로(반려 성공·스테일 종료)도 같은 언마운트를
     * 거치므로 이전 사유가 프리필되지 않는다 — 닫힘을 감시하는 초기화 effect가
     * 필요 없다(MSG-554 `UnpublishDialog`의 effect 방식을 대체).
     */}
    <RejectReasonBody {...body} onClose={() => onOpenChange(false)} />
  </DialogShell>
);

type RejectReasonBodyProps = Omit<
  RejectReasonDialogProps,
  "open" | "onOpenChange"
> & { onClose: () => void };

const RejectReasonBody = ({
  title,
  description,
  isPending,
  errorMessage,
  onConfirm,
  onClose,
}: RejectReasonBodyProps) => {
  const [reason, setReason] = useState("");

  return (
    <ModalCard
      title={title}
      description={`${description} ${MAIL_NOTICE}`}
      cancelText="취소"
      confirmText="반려 확정"
      confirmVariant="danger"
      confirmDisabled={!canSubmitReason(reason) || isPending}
      onCancel={onClose}
      onConfirm={() => onConfirm(reason)}
      onClose={onClose}
    >
      <div className="flex flex-col gap-xs">
        <label
          htmlFor="account-reject-reason"
          className="text-fm-label text-foreground-body"
        >
          반려 사유
        </label>
        <textarea
          id="account-reject-reason"
          rows={4}
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="반려 근거를 적어 주세요 (최대 500자)"
          className="resize-none rounded-sm border border-border bg-surface-soft p-sm text-fm-base text-foreground outline-none placeholder:text-foreground-muted focus:border-primary"
        />
        {errorMessage !== null && (
          <p role="alert" className="text-fm-caption text-error">
            {errorMessage}
          </p>
        )}
      </div>
    </ModalCard>
  );
};
