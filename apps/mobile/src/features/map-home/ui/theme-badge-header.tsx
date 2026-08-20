import { Text, View } from "react-native";
import { cx } from "@fillmap/ui-native";
import { THEME_META, type ThemeId } from "../model/themes";
import { THEME_BADGE_CLASS, THEME_TEXT_CLASS } from "./theme-classes";

/**
 * 칩 목록 시트 헤더 (MSG-427 D3) — `{테마 배지} · {N}개`.
 * Figma 실측: 목록 3종(화면 3·5·7)에는 **뒤로가기도 ✕도 없다** — 해제 수단은 칩 재탭이다(A4).
 */
interface ThemeBadgeHeaderProps {
  theme: ThemeId;
  /** 조회된 미션·코스 수 */
  count: number;
}

export const ThemeBadgeHeader = ({ theme, count }: ThemeBadgeHeaderProps) => (
  <View className="flex-row items-center gap-1.5">
    <View
      className={cx("rounded-full px-1.75 py-0.75", THEME_BADGE_CLASS[theme])}
    >
      <Text className={cx("text-fm-caption", THEME_TEXT_CLASS[theme])}>
        {THEME_META[theme].label}
      </Text>
    </View>
    <Text className="text-fm-label text-foreground-muted">· {count}개</Text>
  </View>
);
