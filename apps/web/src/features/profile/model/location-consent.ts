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

/**
 * 게이트 popstate 방향 판별 (v4 codex P1 — PR 리뷰로 순수 함수 추출).
 * createBrowserRouter(@remix-run/router)가 history.state.idx에 심는 단조 증가
 * 인덱스를 **마지막 관찰값**과 비교한다 — 커질 때만 앞으로가기(true, 게이트 유지).
 * 어느 쪽이든 미상(undefined)이면 false = 뒤로가기 간주: 이탈 수단 보존이 잠금보다
 * 안전하고, 라우터 관리 히스토리에선 미상 발생 경로가 없다.
 * 순수 숫자 비교 — 플랫폼 무의존(history 읽기는 뷰 레이어 몫), RN 경계 위반 없음.
 */
export const isForwardNavigation = (
  idx: number | undefined,
  last: number | undefined,
): boolean => typeof idx === "number" && typeof last === "number" && idx > last;
