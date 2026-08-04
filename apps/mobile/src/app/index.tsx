import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { Redirect } from "expo-router";
import { getOnboardingCompleted } from "../features/onboarding/model/onboarding-storage";
import { OnboardingScreen } from "../features/onboarding/ui/onboarding-screen";
import StorybookUI from "../../.rnstorybook";

/** EXPO_PUBLIC_STORYBOOK=1 이면 Storybook UI로 진입 (metro withStorybook과 동일 조건, 스펙 A4) */
const isStorybook = process.env.EXPO_PUBLIC_STORYBOOK === "1";

// 온보딩 완료 판정(비동기)까지 스플래시 유지 — 홈/온보딩 깜빡임 방지 (MSG-292 확정 3)
if (!isStorybook) {
  void SplashScreen.preventAutoHideAsync();
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
  // 온보딩 완료 → 지도 홈 (MSG-294 AC 5 — MSG-292가 예고한 TokenSample 자리 교체)
  return completed ? (
    <Redirect href="/home" />
  ) : (
    <OnboardingScreen onDone={() => setCompleted(true)} />
  );
}
