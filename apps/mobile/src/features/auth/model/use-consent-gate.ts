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
export const useConsentGate = (): boolean => {
  const { isAuthenticated } = useAuth();
  const { isSuccess, data } = useQuery({
    ...getMeOptions(),
    enabled: isAuthenticated,
    select: (envelope) => unwrapEnvelope(envelope).locationConsent,
  });
  return shouldShowConsentGate({
    isAuthenticated,
    consentKnown: isSuccess,
    locationConsent: data,
  });
};
