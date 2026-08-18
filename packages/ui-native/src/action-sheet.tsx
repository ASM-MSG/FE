import { Modal, Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { Check } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { palette, semantic } from "@fillmap/design-tokens";
import { BottomSheet } from "./bottom-sheet";
import { cx } from "./lib/cx";

interface ActionSheetProps {
  visible: boolean;
  /** 딤 탭·취소 탭·Android back 모두 이걸 호출한다 */
  onClose: () => void;
  /** 메뉴 행·섹션 라벨·구분선 조합 슬롯 */
  children: ReactNode;
  /** 취소 버튼 라벨 (기본 "취소") */
  cancelLabel?: string;
  /**
   * 홈 인디케이터 인셋(px) — 화면이 `useSafeAreaInsets().bottom`을 넘긴다.
   * ui-native는 safe-area 패키지에 의존하지 않는다 (BottomNav ↔ AppBottomNav 선례).
   */
  bottomInset?: number;
  className?: string;
}

/**
 * SOURCE: Figma 격자 상세 더보기(node 14799:26479) · 도감 공개 범위(node 14856:510) —
 * 하단 액션시트. RN Modal 딤 + BottomSheet 쉘 + 취소 버튼 + 홈 인디케이터 인셋을 소유한다.
 * 딤은 ModalCard와 동일 오버레이 관례(bg-navy-900/40) — 오버레이만 Pressable,
 * 시트는 responder를 선점해 시트 내부 탭이 딤으로 새지 않는다.
 * 취소는 ver 6 시안대로 bg-surface 회색 필(구 시안의 border pill을 갱신).
 *
 * @example
 * <ActionSheet visible={open} onClose={close} bottomInset={insets.bottom}>
 *   <ActionSheetItem icon={Pencil} label="수정하기" onPress={edit} />
 *   <ActionSheetItem icon={Trash2} label="삭제하기" danger onPress={remove} />
 * </ActionSheet>
 */
export const ActionSheet = ({
  visible,
  onClose,
  children,
  cancelLabel = "취소",
  bottomInset = 0,
  className,
}: ActionSheetProps) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <Pressable onPress={onClose} className="flex-1 justify-end bg-navy-900/40">
      <View accessibilityViewIsModal onStartShouldSetResponder={() => true}>
        <BottomSheet className={className}>
          <View className="gap-xxs">{children}</View>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            className="h-12 items-center justify-center rounded-full bg-surface active:opacity-80"
          >
            <Text className="text-fm-title text-foreground-body">
              {cancelLabel}
            </Text>
          </Pressable>
          {/* 홈 인디케이터 인셋 확보 — 시트 쉘 pb-md(16) 위에 추가 */}
          <View style={{ height: bottomInset }} />
        </BottomSheet>
      </View>
    </Pressable>
  </Modal>
);

interface ActionSheetItemProps {
  label: string;
  /**
   * 좌측 아이콘 — RN은 currentColor 상속이 없어 색을 이 컴포넌트가 지정한다.
   * 그래서 노드가 아닌 아이콘 컴포넌트 자체를 받는다.
   */
  icon?: LucideIcon;
  /** 파괴적 액션 — 밝은 배경 위 AA 대비를 만족하는 red-600 텍스트/아이콘 */
  danger?: boolean;
  /** 선택된 항목 — 우측에 primary 체크를 표시한다(공개 범위 선택 행) */
  selected?: boolean;
  onPress: () => void;
}

/** 액션시트 메뉴 1행 — 아이콘 행 / 선택 ✓ 행 / danger 행을 겸한다 */
export const ActionSheetItem = ({
  label,
  icon: Icon,
  danger,
  selected,
  onPress,
}: ActionSheetItemProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: !!selected }}
    onPress={onPress}
    className="flex-row items-center gap-sm rounded-md px-xs py-3.5 active:bg-surface-soft"
  >
    {Icon && (
      <Icon
        size={20}
        color={danger ? palette["red-600"] : semantic.textPrimary}
      />
    )}
    <Text
      className={cx(
        "flex-1 text-fm-body",
        danger ? "text-red-600" : "text-foreground",
      )}
    >
      {label}
    </Text>
    {selected && <Check size={18} strokeWidth={2.5} color={semantic.primary} />}
  </Pressable>
);

/** 액션시트 섹션 라벨 (예: "공개 범위") */
export const ActionSheetSectionLabel = ({ label }: { label: string }) => (
  <Text className="px-xs pt-xs text-fm-label text-foreground-muted">
    {label}
  </Text>
);

/** 액션시트 그룹 구분선 */
export const ActionSheetDivider = () => (
  <View className="my-xxs h-px bg-border" />
);
