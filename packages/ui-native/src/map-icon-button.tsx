import { Pressable } from "react-native";
import { ChevronLeft, Locate } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import type {
  MapIconButtonBaseProps,
  MapIconButtonIcon,
} from "@fillmap/design-tokens";
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
  /**
   * 활성(추적 중) 상태 — 아이콘 색만 primary, 배경 불변 (MSG-565 D8, 네이버 지도 앱 추적 모드
   * 미러). ui-native 로컬 prop이라 `MapIconButtonBaseProps`에는 넣지 않는다. 미지정 시 렌더 불변.
   */
  active?: boolean;
}

/**
 * @example
 * <MapIconButton icon="locate" onPress={moveToMyLocation} />
 * <MapIconButton icon="locate" active onPress={moveToMyLocation} />
 */
export const MapIconButton = ({
  icon = "back",
  disabled,
  onPress,
  className,
  active = false,
}: MapIconButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={icon === "back" ? "뒤로 가기" : "내 위치"}
    accessibilityState={{ disabled: !!disabled, selected: active }}
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
      <Locate
        size={20}
        color={active ? semantic.primary : semantic.textPrimary}
      />
    )}
  </Pressable>
);
