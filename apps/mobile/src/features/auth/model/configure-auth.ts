import { configureAuthPipeline } from "../../../shared/api/auth-pipeline";
import type { AuthStore } from "./auth-store";

/**
 * 인증 파이프라인 배선 (AC 7·8) — shared(파이프라인)와 features(스토어)의 연결.
 * 부트스트랩(auth-session)이 1회 호출한다.
 *
 * 로그인 화면 이동은 **콜백으로 주입**받는다 — 모델이 expo-router를 직접 import하지
 * 않는다(RN 경계 규칙). 실제 어댑터는 `shared/navigation.ts`의 `goToLogin`이다.
 *
 * 세션 만료 = 토큰 클리어 + 로그인 화면 이동. 익명 401(저장 refreshToken 없음)은
 * 파이프라인이 이 콜백을 아예 호출하지 않으므로 로그인 화면으로 튕기지 않는다 (AC 8).
 */
export const setupAuthPipeline = ({
  store,
  goToLogin,
}: {
  store: AuthStore;
  goToLogin: () => void;
}): void => {
  configureAuthPipeline({
    getAccessToken: () => store.getState().accessToken,
    getRefreshToken: () => store.getState().refreshToken,
    getDeviceId: () => store.getState().deviceId,
    getSessionGeneration: () => store.getSessionGeneration(),
    // 저장(보안 저장소)이 끝날 때까지 파이프라인이 기다린다 — 쓰기 실패는 그대로
    // 전파돼 재발급 실패로 취급된다. 재발급을 시작한 세대를 함께 넘겨, 그사이
    // 로그아웃·재로그인이 있었으면 스토어가 이 발급분을 적용하지 않는다.
    onTokensIssued: (tokens, sessionGeneration) =>
      store.setTokens(tokens, sessionGeneration),
    onSessionExpired: () => {
      void store.logout();
      goToLogin();
    },
  });
};
