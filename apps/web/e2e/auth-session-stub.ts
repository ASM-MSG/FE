import type { Page } from "@playwright/test";

/**
 * 로그인 세션 시딩 (MSG-328).
 *
 * 점령 격자·핫구역 쿼리에 인증 게이트가 생겨(비로그인 미발사 — 익명 401·reissue
 * 재발사 방지) 비로그인 e2e에서는 네트워크 스텁 응답조차 조회되지 않는다 —
 * 클러스터 소스가 비어 줌 게이트 회귀 스펙이 실패한다.
 *
 * 앱 부트 전에 auth-store 영속 키(fillmap-auth)에 액세스 토큰을 심어 로그인
 * 상태로 시작시킨다 — 값 모양은 auth-store persist 계약(partialize: accessToken,
 * version 1, zustand createJSONStorage 봉투)과 일치해야 재수화가 인정한다.
 * API는 센티널 포트(playwright.config webServer env)라 실 서버 결합은 없다 —
 * 필요한 응답은 page.route 스텁이 공급한다.
 */
export const seedLoggedInSession = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "fillmap-auth",
      JSON.stringify({
        state: { accessToken: "e2e-access-token" },
        version: 1,
      }),
    );
  });
};
