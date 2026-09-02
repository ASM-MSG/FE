import { Text, View } from "react-native";
import { Sparkles } from "lucide-react-native";
import { palette } from "@fillmap/design-tokens";

/**
 * 입력 대기 빈 상태 (Figma 15750:466) — theme-route 10% 원(56) 안 sparkles(28) + 2줄 안내.
 * 웹 `RouteEmptyState`의 모바일판 — 아이콘 색은 RN에 currentColor 상속이 없어 토큰 값을 직접 준다.
 */
export const RouteEmptyState = () => (
  <View className="items-center gap-xs px-md py-md">
    <View className="mb-xxs size-14 items-center justify-center rounded-full bg-theme-route/10">
      <Sparkles size={28} color={palette["theme-route"]} />
    </View>
    <Text className="text-center text-fm-title text-foreground">
      지금 보이는 지도 범위에서 동선을 짜 드려요
    </Text>
    <Text className="text-center text-fm-label text-foreground-muted">
      적은 문장과 지도 범위만 사용해요
    </Text>
  </View>
);
