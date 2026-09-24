import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getMeOptions } from "../../../shared/api/query-options";
import { useAuth } from "./auth-session";
import { shouldShowConsentGate } from "./consent-gate";

/**
 * 회원가입 약관 동의 게이트 훅 (AC 1·2·3) — 로그인 상태에서만 getMe를 조회해
 * `locationConsent=false`면 true를 돌려준다. 판정은 전부 순수 함수(consent-gate)에 위임한다.
 *
 * `enabled: isAuthenticated` — 비로그인은 쿼리 미발사(익명 401 게이트 관례, MSG-419).
 * 보안 저장소 재수화 전에는 저장 토큰이 아직 스토어에 없어 isAuthenticated가 false이므로
 * 이 한 조건이 "재수화 전 미발사"까지 함께 만족한다 (AC 3).
 *
 * 캐시 키는 getMeQueryKey와 동일해, 동의 PUT 성공의 invalidate가 이 관찰자를 재조회시켜
 * 게이트가 스스로 해제된다 (AC 18).
 */
export interface ConsentGateState {
  /** 전면 동의 화면을 그릴지 */
  show: boolean;
  /**
   * 동의 여부 조회가 끝났는지(성공·실패 모두) — 푸시 탭 라우팅(MSG-605)이 이 값을 기다린다.
   * 조회 중에는 `show`가 false라 "게이트 열림"으로 오판하기 쉽다: 그때 이동해 버리면 곧 뜨는 동의 화면이
   * 네비게이터를 통째로 내려 목적지를 잃는다(codex 리뷰). 실패는 게이트를 안 세우는 기존 정책 그대로라
   * 종결로 본다. 비로그인은 조회가 없으니 종결이다.
   */
  resolved: boolean;
}

export const useConsentGateState = (): ConsentGateState => {
  const { isAuthenticated } = useAuth();
  const { isSuccess, isError, data } = useQuery({
    ...getMeOptions(),
    enabled: isAuthenticated,
    select: (envelope) => unwrapEnvelope(envelope).locationConsent,
  });
  return {
    show: shouldShowConsentGate({
      isAuthenticated,
      consentKnown: isSuccess,
      locationConsent: data,
    }),
    resolved: !isAuthenticated || isSuccess || isError,
  };
};

export const useConsentGate = (): boolean => useConsentGateState().show;
