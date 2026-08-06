import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flag, Pencil, Trash2 } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { BottomSheet } from "@fillmap/ui-native";

/** 메뉴 1행 — 좌측 아이콘 + 라벨, 삭제는 error 색 (AC 1, Figma 14094:4885) */
const MenuRow = ({
  icon: Icon,
  label,
  danger,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    className="flex-row items-center gap-sm rounded-md px-xs py-3.5 active:bg-surface-soft"
  >
    <Icon size={20} color={danger ? semantic.error : semantic.textPrimary} />
    <Text
      className={
        danger ? "text-fm-body text-error" : "text-fm-body text-foreground"
      }
    >
      {label}
    </Text>
  </Pressable>
);

interface MoreMenuSheetProps {
  visible: boolean;
  /** 취소 탭·딤 탭·Android back — 격자 상세 유지 (AC 2) */
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
}

/**
 * 더보기 액션시트 메뉴 (MSG-317 AC 1~3, Figma 14094:4885) — RN Modal 딤 +
 * ui-native BottomSheet 쉘 조립. 첫 사용처라 features 로컬 구성 (스펙 —
 * 두 번째 사용처 등장 시 ui-native ActionSheet 승격 재검토). 딤은 ModalCard와
 * 동일 오버레이 관례(bg-navy-900/40) — Figma 프레임의 풀 다크 배경은 캔버스 배경.
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* 딤 탭 닫기 (AC 2) — ModalCard 딤 관례: 오버레이만 Pressable, 시트는 responder 선점 */}
      <Pressable
        onPress={onClose}
        className="flex-1 justify-end bg-navy-900/40"
      >
        <View accessibilityViewIsModal onStartShouldSetResponder={() => true}>
          <BottomSheet>
            <View className="gap-xxs">
              <MenuRow icon={Pencil} label="수정하기" onPress={onEdit} />
              <MenuRow
                icon={Trash2}
                label="삭제하기"
                danger
                onPress={onDelete}
              />
              <MenuRow icon={Flag} label="신고하기" onPress={onReport} />
            </View>
            {/* 취소 (AC 2) — ModalCard [취소] border pill 관례 */}
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              className="h-12 items-center justify-center rounded-full border border-border active:opacity-80"
            >
              <Text className="text-fm-title text-foreground-body">취소</Text>
            </Pressable>
            {/* 홈 인디케이터 인셋 확보 — 시트 쉘 pb-md(16) 위에 추가 */}
            <View style={{ height: insets.bottom }} />
          </BottomSheet>
        </View>
      </Pressable>
    </Modal>
  );
};
