import { ActivityIndicator, Text, View } from "react-native";
import { palette } from "@fillmap/design-tokens";

/**
 * 상태줄 (Figma 15751:512·15751:448) — "AI 추천" 뱃지 + 진행/개수, 우측에 뷰포트 근거 문구.
 * 뱃지 pill은 `THEME_BADGE_CLASS.route`와 같은 값(§6). 로딩 도트는 ui-native에 없어
 * `ActivityIndicator`로 대응한다 (D11, §8 오탐 3).
 * `accessibilityLiveRegion`으로 로딩→결과 전환이 낭독된다 (S13).
 */
interface RouteResultHeaderProps {
  /** 로딩 중이면 개수 대신 "동선 찾는 중" + 스피너 */
  loading: boolean;
  count: number;
}

export const RouteResultHeader = ({
  loading,
  count,
}: RouteResultHeaderProps) => (
  <View
    accessibilityLiveRegion="polite"
    className="flex-row items-center justify-between gap-sm"
  >
    <View className="flex-row items-center gap-xs">
      <View className="rounded-full bg-theme-route/10 px-2 py-0.5">
        <Text className="text-fm-label text-theme-route">AI 추천</Text>
      </View>
      <Text className="text-fm-label text-foreground-muted">
        {loading ? "· 동선 찾는 중" : `· ${count}곳`}
      </Text>
      {loading && (
        <ActivityIndicator size="small" color={palette["theme-route"]} />
      )}
    </View>
    <Text className="shrink-0 text-fm-caption text-foreground-muted">
      지금 지도 범위 기준
    </Text>
  </View>
);
