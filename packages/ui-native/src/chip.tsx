import { Pressable, Text } from "react-native";
import type { ReactNode } from "react";
import { Check } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import type { ChipBaseProps } from "@fillmap/design-tokens";
import { cx } from "./lib/cx";

interface ChipProps extends ChipBaseProps {
  text: string;
  /**
   * 리딩 아이콘 슬롯 (MSG-294 D10) — 텍스트 왼쪽에 렌더된다. 미지정 시 렌더 불변.
   * RN은 currentColor 상속이 없으므로 아이콘 색은 호출부가 design-tokens 값으로 전달한다.
   */
  icon?: ReactNode;
  onPress?: () => void;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap Chip" (node 13428:693) — 필터/정렬 칩.
 * State=active는 boolean prop, State=pressed는 active: 인터랙션으로 처리.
 * 아이콘 색은 RN에 currentColor 상속이 없어 design-tokens 값을 직접 전달한다.
 *
 * @example
 * <Chip text="부산진구" active onPress={onToggle} />
 * @example
 * <Chip text="핫구역" icon={<Flame size={14} color={palette["theme-hot"]} />} />
 */
export const Chip = ({
  text,
  icon,
  active = false,
  disabled,
  onPress,
  className,
}: ChipProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: active, disabled: !!disabled }}
    disabled={disabled}
    onPress={onPress}
    className={cx(
      "h-8 flex-row items-center gap-xxs rounded-full px-3.5 active:opacity-80",
      active ? "bg-primary" : "bg-background",
      disabled && "opacity-50",
      className,
    )}
  >
    {icon}
    {active && <Check size={12} strokeWidth={3} color={semantic.onPrimary} />}
    <Text
      className={cx(
        "text-fm-label",
        active ? "text-primary-foreground" : "text-foreground",
      )}
    >
      {text}
    </Text>
  </Pressable>
);
