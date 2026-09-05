import { Pressable, Text } from "react-native";
import { Ticket } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { cx } from "@fillmap/ui-native";

/**
 * 이벤트 카테고리 칩 (MSG-557 D1·D20) — 테마 칩 행 5번째, Figma 15785:3902 (대안 2).
 * 크기·간격은 앱 칩 규격(`theme-chip.tsx`: h-9.5, 아이콘 16)과 같고 색만 다르다 —
 * 비활성 흰 배경 + primary 아이콘, 활성 `bg-primary` + 흰 라벨·아이콘(웹 활성 캡슐 색).
 * `ThemeChip`은 `id: ThemeId`에 묶여 있어(5표 typecheck) 재사용하지 않는다 (D2).
 */
const ICON_SIZE = 16;

interface EventChipProps {
  active: boolean;
  onPress: () => void;
}

export const EventChip = ({ active, onPress }: EventChipProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    onPress={onPress}
    className={cx(
      "h-9.5 flex-row items-center gap-xxs rounded-full px-sm shadow-raised active:opacity-80",
      active ? "bg-primary" : "bg-background",
    )}
  >
    <Ticket
      size={ICON_SIZE}
      color={active ? semantic.onPrimary : semantic.primary}
    />
    <Text
      className={cx(
        "text-fm-body-strong",
        active ? "text-primary-foreground" : "text-foreground",
      )}
    >
      이벤트
    </Text>
  </Pressable>
);
