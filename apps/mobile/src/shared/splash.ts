import * as SplashScreen from "expo-splash-screen";
import { createSplashGate } from "./splash-gate";

/**
 * 스플래시 게이트 실인스턴스 (MSG-445) — 네이티브(expo-splash-screen)·타이머 결합 지점.
 * 판정 로직은 전부 `splash-gate.ts`(순수·vitest)에 있고 여기는 어댑터다
 * (`navigation.ts`와 같은 RN 경계 규칙).
 *
 * 앱 전역에서 하나만 쓴다 — 진입점(`app/index.tsx`)이 목적지에 따라 붙잡거나 내리고,
 * 지도 홈(`map-home-screen.tsx`)이 지도 첫 렌더 시 내린다.
 */
export const splashGate = createSplashGate({
  hide: () => {
    void SplashScreen.hideAsync();
  },
  schedule: (fn, ms) => {
    const timer = setTimeout(fn, ms);
    return () => clearTimeout(timer);
  },
});
