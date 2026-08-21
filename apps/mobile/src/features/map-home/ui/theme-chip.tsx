import { Pressable, Text } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { cx } from "@fillmap/ui-native";
import { themeChipView } from "../model/theme-chip-view";
import type { ThemeId } from "../model/themes";

/**
 * 테마 필터 칩 (MSG-423 요구 3·4) — Figma 지도 홈 상단 칩(14799:25653) + 선택 v2(14851:390).
 *
 * 공용 `ui-native/Chip`을 쓸 수 없다: active일 때 `Check` 아이콘을 강제하고 배경이
 * `bg-primary` 단색이라 이 디자인(활성 시에도 고유 아이콘 유지 + 테마 4색)을 못 낸다.
 * 웹이 같은 이유로 로컬 `ThemeChip`을 둔 선례를 따른다 — 승격 후보이지만
 * `ui-native/index.ts` 잠금(MSG-420 합의)으로 이번엔 화면 로컬이다.
 *
 * 크기는 웹 정본(h-9.5=38px, 아이콘 16px)을 따른다 — 티켓 "웹과 동일한 크기" 우선
 * (모바일 Figma 실측 40/20과 2~4px 차, 스펙 추정 6).
 */

/** 아이콘 크기 — 웹 ThemeChip `size-4`와 동일 */
const ICON_SIZE = 16;

interface ThemeChipProps {
  id: ThemeId;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onPress: () => void;
}

export const ThemeChip = ({
  id,
  label,
  icon: Icon,
  active,
  onPress,
}: ThemeChipProps) => {
  const view = themeChipView(id, active);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={cx(
        "h-9.5 flex-row items-center gap-xxs rounded-full px-sm shadow-raised active:opacity-80",
        view.bg,
      )}
    >
      {/* RN은 currentColor 상속이 없어 아이콘 색을 값으로 전달한다 (ui-native Chip 관례) */}
      <Icon size={ICON_SIZE} color={view.icon} />
      <Text className={cx("text-fm-body-strong", view.label)}>{label}</Text>
    </Pressable>
  );
};
