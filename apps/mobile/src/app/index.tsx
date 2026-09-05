import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { Redirect, useRouter } from "expo-router";
import { resolveEntry } from "../features/auth/model/app-entry";
import { useAuth } from "../features/auth/model/auth-session";
import { getOnboardingCompleted } from "../features/onboarding/model/onboarding-storage";
import { OnboardingScreen } from "../features/onboarding/ui/onboarding-screen";
import { resolveUploadResumeRoute } from "../features/upload/model/upload-flow-persistence";
import type { UploadResumeRoute } from "../features/upload/model/upload-flow-resume";
import { splashGate } from "../shared/splash";
import StorybookUI from "../../.rnstorybook";

/** EXPO_PUBLIC_STORYBOOK=1 이면 Storybook UI로 진입 (metro withStorybook과 동일 조건, 스펙 A4) */
const isStorybook = process.env.EXPO_PUBLIC_STORYBOOK === "1";

// 온보딩 완료 판정(비동기)까지 스플래시 유지 — 홈/온보딩 깜빡임 방지 (MSG-292 확정 3)
if (!isStorybook) {
  void SplashScreen.preventAutoHideAsync();
}

export default function Index() {
  const router = useRouter();
  const { hydrated, isAuthenticated } = useAuth();
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
    });
  }, []);

  // 저장소 판정 + 세션 재수화가 둘 다 끝나야 진입을 정한다 — 그 전엔 스플래시 유지 (MSG-561 D3)
  const entry =
    completed === null || !hydrated
      ? null
      : resolveEntry({
          onboardingCompleted: completed,
          isAuthenticated,
          resume,
        });

  useEffect(() => {
    if (entry === null) return;
    // 지도 홈이 목적지일 때만 지도 첫 렌더까지 붙잡는다 (MSG-445) — 여기서 바로 내리면
    // 앱 UI는 다 그려졌는데 지도 자리만 SDK 빈 격자 플레이스홀더로 약 1초 남는다.
    // 지도가 없는 목적지(온보딩·로그인·업로드 이어가기)는 기다릴 대상이 없으므로 즉시 내린다.
    if (entry === "home") splashGate.holdUntilMapReady();
    else splashGate.release();
  }, [entry]);

  useEffect(() => {
    if (entry !== "resume" || resume === null) return;
    // 홈을 스택 바닥에 깔고 그 위에 진행 중이던 화면을 얹는다 — 완료 화면 [확인]의
    // dismissTo("/home")과 [이전 단계로]가 돌아갈 자리를 남긴다 (기준 29)
    router.replace("/home");
    router.push(resume);
  }, [entry, resume, router]);

  if (isStorybook) return <StorybookUI />;
  if (entry === null) return null;
  if (entry === "onboarding") {
    // 시작하기·건너뛰기 모두 완료로 저장하고 다시 판정 — 비로그인이면 로그인으로 replace돼
    // 뒤로가기로 온보딩에 돌아오지 않는다 (MSG-421 Q1 · MSG-561 D4)
    return (
      <OnboardingScreen
        onDone={() => setCompleted(true)}
        onSkip={() => setCompleted(true)}
      />
    );
  }
  // 앱은 로그인 필수 — 세션이 없으면 로그인 화면으로 (MSG-561 D4·D5, 로그인 후 목적지는 홈 고정)
  if (entry === "login") return <Redirect href="/login" />;
  // 이어갈 업로드가 있으면 위 효과가 이동시킨다 — 여기서 홈으로 한 번 더 보내지 않는다
  if (entry === "resume") return null;
  // 온보딩 완료 + 로그인 → 지도 홈 (MSG-294 AC 5 — MSG-292가 예고한 TokenSample 자리 교체)
  return <Redirect href="/home" />;
}
