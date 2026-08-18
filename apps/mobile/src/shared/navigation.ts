import { router } from "expo-router";

/**
 * 네비게이션 어댑터 (AC 7) — RN 경계 규칙의 지정 경유지.
 * 모델(auth-store·configure-auth)은 expo-router를 직접 import하지 않고 이 어댑터를
 * 콜백으로 주입받는다 (웹 shared/navigation.ts 선례). 라우터 교체 시 이 파일만 바뀐다.
 */

/** 세션 만료 시 로그인 화면으로 보낸다 — 만료된 화면으로 되돌아갈 수 없게 replace를 쓴다 */
export const goToLogin = (): void => {
  router.replace("/login");
};
