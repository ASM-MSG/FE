import { Pressable } from "react-native";
import type { ReactNode } from "react";
import { Plus } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { cx } from "./lib/cx";

interface FabProps {
  /** 아이콘 슬롯. 기본 + */
  icon?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap FAB" (node 13431:697) — 기록/업로드 플로팅 버튼 (56px).
 *
 * @example
 * <Fab accessibilityLabel="기록하기" onPress={onRecord} />
 */
export const Fab = ({
  icon,
  onPress,
  disabled,
  accessibilityLabel,
  className,
}: FabProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ disabled: !!disabled }}
    disabled={disabled}
    onPress={onPress}
    className={cx(
      "size-14 items-center justify-center rounded-full bg-primary shadow-fab active:opacity-80",
      disabled && "opacity-50",
      className,
    )}
  >
    {icon ?? <Plus size={20} strokeWidth={3} color={semantic.onPrimary} />}
  </Pressable>
);
