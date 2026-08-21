import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { Redirect, useRouter } from "expo-router";
import { getOnboardingCompleted } from "../features/onboarding/model/onboarding-storage";
import { OnboardingScreen } from "../features/onboarding/ui/onboarding-screen";
import { resolveUploadResumeRoute } from "../features/upload/model/upload-flow-persistence";
import type { UploadResumeRoute } from "../features/upload/model/upload-flow-resume";
import { goToLogin } from "../shared/navigation";
import StorybookUI from "../../.rnstorybook";

/** EXPO_PUBLIC_STORYBOOK=1 이면 Storybook UI로 진입 (metro withStorybook과 동일 조건, 스펙 A4) */
const isStorybook = process.env.EXPO_PUBLIC_STORYBOOK === "1";

// 온보딩 완료 판정(비동기)까지 스플래시 유지 — 홈/온보딩 깜빡임 방지 (MSG-292 확정 3)
if (!isStorybook) {
  void SplashScreen.preventAutoHideAsync();
}

export default function Index() {
  const router = useRouter();
  /** null = 판정 전 (스플래시 유지) */
  const [completed, setCompleted] = useState<boolean | null>(null);
  /** 진행 중이던 업로드가 있으면 이어갈 라우트 (MSG-424 기준 36) */
  const [resume, setResume] = useState<UploadResumeRoute | null>(null);

  useEffect(() => {
    if (isStorybook) return;
    // 업로드 재수화도 함께 기다린다 — 스플래시가 내려간 뒤 화면이 바뀌지 않게 (기준 36·38)
    void Promise.all([
      getOnboardingCompleted(),
      resolveUploadResumeRoute(),
    ]).then(([done, resumeRoute]) => {
      setCompleted(done);
      setResume(resumeRoute);
      void SplashScreen.hideAsync();
    });
  }, []);

  useEffect(() => {
    if (completed !== true || resume === null) return;
    // 홈을 스택 바닥에 깔고 그 위에 진행 중이던 화면을 얹는다 — 완료 화면 [확인]의
    // dismissTo("/home")과 [이전 단계로]가 돌아갈 자리를 남긴다 (기준 29)
    router.replace("/home");
    router.push(resume);
  }, [completed, resume, router]);

  if (isStorybook) return <StorybookUI />;
  if (completed === null) return null;
  if (!completed) {
    // 건너뛰기도 완료로 저장하고 로그인으로 replace — 뒤로가기로 온보딩에 돌아오지 않는다 (MSG-421 Q1)
    return (
      <OnboardingScreen onDone={() => setCompleted(true)} onSkip={goToLogin} />
    );
  }
  // 이어갈 업로드가 있으면 위 효과가 이동시킨다 — 여기서 홈으로 한 번 더 보내지 않는다
  if (resume !== null) return null;
  // 온보딩 완료 → 지도 홈 (MSG-294 AC 5 — MSG-292가 예고한 TokenSample 자리 교체)
  return <Redirect href="/home" />;
}
