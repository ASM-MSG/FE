import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { Button, Chip } from "@fillmap/ui-native";
import { getOnboardingCompleted } from "../features/onboarding/model/onboarding-storage";
import { OnboardingScreen } from "../features/onboarding/ui/onboarding-screen";
import StorybookUI from "../../.rnstorybook";

/** EXPO_PUBLIC_STORYBOOK=1 이면 Storybook UI로 진입 (metro withStorybook과 동일 조건, 스펙 A4) */
const isStorybook = process.env.EXPO_PUBLIC_STORYBOOK === "1";

// 온보딩 완료 판정(비동기)까지 스플래시 유지 — 홈/온보딩 깜빡임 방지 (MSG-292 확정 3)
if (!isStorybook) {
  void SplashScreen.preventAutoHideAsync();
}

/**
 * 토큰 클래스 동작 샘플 — 웹과 동일한 값(hex/px)으로 렌더링되는지 확인용 (수용 기준 2).
 * 실제 화면 구현은 이 티켓 범위 밖이며, 화면 티켓에서 교체된다.
 */
function TokenSample() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-md p-lg">
        <Text className="text-fm-display text-foreground">FillMap Mobile</Text>
        <Text className="text-center text-fm-body text-foreground-body">
          bg-primary · text-fm-* · rounded-md · p-md 토큰 클래스 샘플
        </Text>
        <View className="items-center rounded-md bg-primary p-md">
          <Text className="text-fm-title text-primary-foreground">
            bg-primary + rounded-md + p-md
          </Text>
        </View>
        <Button text="버튼" />
        <Chip text="서면 1번가" active />
      </View>
    </SafeAreaView>
  );
}

export default function Index() {
  /** null = 판정 전 (스플래시 유지) */
  const [completed, setCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (isStorybook) return;
    void getOnboardingCompleted().then((done) => {
      setCompleted(done);
      void SplashScreen.hideAsync();
    });
  }, []);

  if (isStorybook) return <StorybookUI />;
  if (completed === null) return null;
  return completed ? (
    <TokenSample />
  ) : (
    <OnboardingScreen onDone={() => setCompleted(true)} />
  );
}
