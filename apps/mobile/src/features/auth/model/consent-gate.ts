/**
 * 회원가입 약관 동의 게이트 판정 (AC 1·2·3) — 웹 `features/profile/model/location-consent.ts`의
 * `shouldShowConsentGate` 포팅. 동등성은 consent-gate.parity.test.ts가 웹 원본을 동적
 * import해 고정한다(모바일 유일 소비처가 회원가입 게이트라 배치만 auth로 옮겼다 — 승인 Q4).
 * 순수 함수 — 플랫폼 API·라우터 무의존.
 *
 * 웹의 `isForwardNavigation`은 `window.history.state.idx` 전용 판별이라 RN에 대응 개념이
 * 없어 포팅하지 않는다(승인 Q3) — 게이트가 네비게이터를 대체하는 구조에서는 "앞으로가기"
 * 이벤트 자체가 없고, 뒤로가기 두 트리거(헤더 `‹`·하드웨어)는 무조건 로그인 중단이다.
 */

interface ConsentGateInput {
  /** 로그인 여부 — 비로그인은 게이트 비대상 (AC 3, 익명 401 게이트 관례) */
  isAuthenticated: boolean;
  /** getMe 성공으로 동의 여부가 확인됐는지 — 로딩·실패 중에는 게이트를 띄우지 않는다 (AC 2) */
  consentKnown: boolean;
  /** getMe 응답의 locationConsent — 미확인이면 undefined */
  locationConsent: boolean | undefined;
}

/**
 * 게이트 표시 판정 — 인증됨 ∧ getMe 성공 ∧ `locationConsent === false`에만 반응한다.
 * 서버 오류·로딩 중에 게이트를 띄우면 앱 전체가 잠기므로 성공 응답의 false에만 반응 (AC 2).
 */
export const shouldShowConsentGate = ({
  isAuthenticated,
  consentKnown,
  locationConsent,
}: ConsentGateInput): boolean =>
  isAuthenticated && consentKnown && locationConsent === false;
