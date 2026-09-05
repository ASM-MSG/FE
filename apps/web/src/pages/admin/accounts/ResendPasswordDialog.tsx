import { DialogShell, ModalCard } from "@fillmap/ui-web";

interface ResendPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 재발송 대상 계정의 아이디(공식 이메일) — 안내 문구에 싣는다 */
  email: string;
  isPending: boolean;
  onConfirm: () => void;
}

/**
 * 비밀번호 재발송 확인 (MSG-551 AC 10 · 스펙 추정 11).
 *
 * **재발송 = 재발급**이라 이전 초기 비밀번호가 즉시 무효가 된다(서버 doc) —
 * 파괴적 조작이므로 클릭 즉시 발사하지 않고 확인 단계를 한 번 둔다. Figma에 모달
 * 프레임이 없어 관례(DialogShell + ModalCard, UnpublishDialog 선례)로 구현한다.
 *
 * 사유 입력이 없어 로컬 state가 없다 — 실패 안내는 목록 카드가 소유한다(모달은 닫힌다).
 */
export const ResendPasswordDialog = ({
  open,
  onOpenChange,
  email,
  isPending,
  onConfirm,
}: ResendPasswordDialogProps) => (
  <DialogShell
    open={open}
    onOpenChange={onOpenChange}
    srTitle="초기 비밀번호 재발송"
  >
    <ModalCard
      title="비밀번호 재발송"
      description={`'${email}' 계정에 초기 비밀번호를 다시 발송합니다. 재발송은 재발급이라 이전 초기 비밀번호는 즉시 무효가 됩니다.`}
      cancelText="취소"
      confirmText="재발송 확정"
      confirmDisabled={isPending}
      onCancel={() => onOpenChange(false)}
      onConfirm={onConfirm}
      onClose={() => onOpenChange(false)}
    />
  </DialogShell>
);
