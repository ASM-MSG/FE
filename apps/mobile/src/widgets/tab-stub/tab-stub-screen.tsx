import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppBottomNav } from "../bottom-nav/app-bottom-nav";

/**
 * 탭 스텁 화면 (AC 12) — 탐색·도감·프로필 실화면은 티켓 제외 범위.
 * 화면명 텍스트 + 바텀 내비(라우트 기반 활성)만 갖춘, 시트 리셋 규칙(AC 13)
 * 성립을 위한 최소 장치다 (탐색·도감·프로필 3화면 공용 — widgets).
 */
export const TabStubScreen = ({ title }: { title: string }) => {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-1 items-center justify-center">
        <Text className="text-fm-title text-foreground">{title}</Text>
      </View>
      {/* 하단 인셋 배경 채움은 AppBottomNav가 소유 (AC 16 4차) */}
      <AppBottomNav />
    </View>
  );
};
