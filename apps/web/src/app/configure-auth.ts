import { useAuthStore } from "@/features/auth/model/auth-store";
import { configureAuthPipeline } from "@/shared/api/auth-pipeline";

/**
 * 인증 파이프라인 배선 (MSG-324) — shared(파이프라인)와 features(스토어)의 연결은
 * app 레이어 몫이다(FSD). main.tsx에서 부트스트랩 시 1회 호출한다.
 * main.tsx는 테스트 진입점이 아니라 계약을 단정할 수 없어 이 모듈로 분리했다.
 */

/**
 * 세션 만료(재발급 실패) 처리 — **토큰만 비운다.**
 *
 * MSG-325: 여기서 로그인 모달을 열지 않는다. 401은 화면 어디서든 날 수 있어
 * (비로그인 상태에서는 지도 조회가 뷰포트 이동마다 401을 낸다) 모달을 열면
 * 사용자가 부르지 않은 모달이 반복해서 뜬다. 로그인 모달이 뜨는 유일한 조건은
 * **프로필 진입 시 비로그인**이고, 그 판정은 SideRailNav(클릭)와 RequireAuth(직접 진입)가 한다.
 */
export const handleSessionExpired = (): void => {
  useAuthStore.getState().logout();
};

/** 부트스트랩 배선 — 토큰 주입·재발급 반영·만료 처리를 파이프라인에 연결한다 */
export const setupAuthPipeline = (): void => {
  configureAuthPipeline({
    getAccessToken: () => useAuthStore.getState().accessToken,
    onTokenRefreshed: (accessToken) =>
      useAuthStore.getState().setAccessToken(accessToken),
    onSessionExpired: handleSessionExpired,
  });
};
