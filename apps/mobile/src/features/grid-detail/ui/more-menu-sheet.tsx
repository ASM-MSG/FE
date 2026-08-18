import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flag, Pencil, Trash2 } from "lucide-react-native";
import { ActionSheet, ActionSheetItem } from "@fillmap/ui-native";

interface MoreMenuSheetProps {
  visible: boolean;
  /** 취소 탭·딤 탭·Android back — 격자 상세 유지 (AC 2) */
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
}

/**
 * 더보기 액션시트 메뉴 (MSG-317 AC 1~3, Figma 14094:4885) — MSG-420에서
 * ui-native `ActionSheet` 조합으로 재구성했다(2026-08-06 승격 합의 이행).
 * 딤·시트 쉘·취소·홈 인디케이터 인셋은 ActionSheet가 소유하고, 여기는 메뉴 구성만 남는다.
 * 취소 버튼 시각은 승격과 함께 ver 6 시안(bg-surface 필)으로 갱신 — 동작은 등가다.
 */
export const MoreMenuSheet = ({
  visible,
  onClose,
  onEdit,
  onDelete,
  onReport,
}: MoreMenuSheetProps) => {
  const insets = useSafeAreaInsets();
  return (
    <ActionSheet
      visible={visible}
      onClose={onClose}
      bottomInset={insets.bottom}
    >
      <ActionSheetItem icon={Pencil} label="수정하기" onPress={onEdit} />
      <ActionSheetItem
        icon={Trash2}
        label="삭제하기"
        danger
        onPress={onDelete}
      />
      <ActionSheetItem icon={Flag} label="신고하기" onPress={onReport} />
    </ActionSheet>
  );
};
