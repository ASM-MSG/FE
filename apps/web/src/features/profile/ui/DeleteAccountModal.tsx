import { DialogShell, ModalCard } from "@fillmap/ui-web";
import { useDeleteAccount } from "../api/use-profile-mutations";

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 삭제 성공 후 이동 — 홈 이동(라우터)은 페이지 레이어 몫 (RN 경계: 콜백 주입) */
  onDeleted: () => void;
}

/**
 * 계정 삭제 확인 모달 (MSG-329 A10·A11) — 비가역 삭제 경고 + danger 확인.
 * Figma 프레임 부재(결정 D 확정) — SettingRow + ModalCard(danger) 패턴 신설이라
 * Figma 대조 대상이 아니다 (오탐 방지 8).
 * 확인 시 DELETE /api/users/me — 성공하면 훅이 토큰·캐시를 비우고 onDeleted를 부른다.
 * 실패 시 모달이 닫히지 않고 오류가 남으며 세션이 유지된다 (A11).
 */
export const DeleteAccountModal = ({
  open,
  onOpenChange,
  onDeleted,
}: DeleteAccountModalProps) => {
  const { mutate, isPending, isError, reset } = useDeleteAccount({ onDeleted });

  // 닫힐 때 오류 상태를 정리해 재오픈 시 이전 실패 문구가 남지 않게 한다
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (isPending) return; // 삭제 진행 중에는 닫지 않는다 — 결과 불명 상태 방지
      reset();
    }
    onOpenChange(next);
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={handleOpenChange}
      srTitle="계정 삭제"
    >
      <ModalCard
        title="계정 삭제"
        description="계정을 삭제하면 올린 영상과 수집 기록이 모두 사라지고 되돌릴 수 없어요. 정말 삭제할까요?"
        cancelText="취소"
        confirmText={isPending ? "삭제 중…" : "삭제"}
        confirmVariant="danger"
        confirmDisabled={isPending}
        onCancel={() => handleOpenChange(false)}
        onConfirm={() => mutate()}
        onClose={() => handleOpenChange(false)}
      >
        {isError && (
          <p role="alert" className="text-fm-label text-error">
            계정 삭제에 실패했어요. 잠시 후 다시 시도해주세요
          </p>
        )}
      </ModalCard>
    </DialogShell>
  );
};
