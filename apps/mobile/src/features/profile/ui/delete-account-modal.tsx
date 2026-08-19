import { Text } from "react-native";
import { ModalCard } from "@fillmap/ui-native";
import { useDeleteAccount } from "../api/use-delete-account";

interface DeleteAccountModalProps {
  visible: boolean;
  /** [취소]·딤 탭 — 요청 없이 닫는다 (기준 9) */
  onClose: () => void;
  /** 삭제 성공 후 이동 — 라우팅은 화면이 주입한다 (RN 경계) */
  onDeleted: () => void;
}

/**
 * 계정 삭제 확인 모달 (기준 9·10) — 웹 `DeleteAccountModal` 문구 정본을 그대로 쓴다.
 * Figma 프레임이 없다(신설 요소, 스펙 R4-5) — 대조 비대상이고 `ModalCard(danger)` 조립이다.
 * 삭제 진행 중에는 닫히지 않고(결과 불명 상태 방지), 닫을 때 오류 상태를 정리해
 * 재오픈 시 이전 실패 문구가 남지 않게 한다.
 */
export const DeleteAccountModal = ({
  visible,
  onClose,
  onDeleted,
}: DeleteAccountModalProps) => {
  const { mutate, isPending, isError, reset } = useDeleteAccount({ onDeleted });

  const close = () => {
    if (isPending) return;
    reset();
    onClose();
  };

  return (
    <ModalCard
      visible={visible}
      title="계정 삭제"
      description="계정을 삭제하면 올린 영상과 수집 기록이 모두 사라지고 되돌릴 수 없어요. 정말 삭제할까요?"
      cancelText="취소"
      confirmText={isPending ? "삭제 중…" : "삭제"}
      confirmVariant="danger"
      confirmDisabled={isPending}
      onCancel={close}
      onOverlayPress={close}
      onConfirm={() => mutate()}
    >
      {isError && (
        // 실패 시 모달이 유지되고 세션도 살아 있다 — 재시도 가능 (기준 10)
        <Text accessibilityRole="alert" className="text-fm-label text-red-600">
          계정 삭제에 실패했어요. 잠시 후 다시 시도해주세요
        </Text>
      )}
    </ModalCard>
  );
};
