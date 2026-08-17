/**
 * 위치정보 동의 온보딩 게이트 판정 (MSG-407 기준 1·2·3, 추정 4).
 * 순수 함수 — 플랫폼 API·라우터 무의존, RN 재사용 대상.
 */

interface ConsentGateInput {
  /** 로그인 여부 — 비로그인은 게이트 비대상 (기준 3, 익명 401 게이트 관례) */
  isAuthenticated: boolean;
  /** getMe 성공으로 동의 여부가 확인됐는지 — 로딩·실패 중에는 게이트를 띄우지 않는다 (추정 4) */
  consentKnown: boolean;
  /** getMe 응답의 locationConsent — 미확인이면 undefined */
  locationConsent: boolean | undefined;
}

/**
 * 게이트 표시 판정 — 인증됨 ∧ getMe 성공 ∧ `locationConsent === false`에만 반응한다.
 * 서버 오류·로딩 중에 게이트를 띄우면 앱 전체가 잠기므로 성공 응답의 false에만 반응 (추정 4).
 */
export const shouldShowConsentGate = ({
  isAuthenticated,
  consentKnown,
  locationConsent,
}: ConsentGateInput): boolean =>
  isAuthenticated && consentKnown && locationConsent === false;
