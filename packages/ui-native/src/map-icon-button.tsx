import { Pressable } from "react-native";
import { ChevronLeft, Locate } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import type { MapIconButtonBaseProps, MapIconButtonIcon } from "@fillmap/design-tokens";
import { cx } from "./lib/cx";

/**
 * SOURCE: Figma "FeelMap MapIconButton" (node 13404:693) — 지도 위 아이콘 버튼 (40px).
 * back은 배경 없는 아이콘, locate는 흰 원형 + Raised 그림자.
 */
const iconVariant: Record<MapIconButtonIcon, string> = {
  back: "active:bg-surface",
  locate: "bg-surface-elevated shadow-raised active:opacity-80",
};

interface MapIconButtonProps extends MapIconButtonBaseProps {
  onPress?: () => void;
  className?: string;
}

/**
 * @example
 * <MapIconButton icon="locate" onPress={moveToMyLocation} />
 */
export const MapIconButton = ({
  icon = "back",
  disabled,
  onPress,
  className,
}: MapIconButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={icon === "back" ? "뒤로 가기" : "내 위치"}
    accessibilityState={{ disabled: !!disabled }}
    disabled={disabled}
    onPress={onPress}
    className={cx(
      "size-10 items-center justify-center rounded-full",
      iconVariant[icon],
      disabled && "opacity-50",
      className,
    )}
  >
    {icon === "back" ? (
      <ChevronLeft size={22} color={semantic.textPrimary} />
    ) : (
      <Locate size={20} color={semantic.textPrimary} />
    )}
  </Pressable>
);
