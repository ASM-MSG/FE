import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getMeOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { shouldShowConsentGate } from "./location-consent";

/**
 * 위치정보 동의 게이트 훅 (MSG-407 기준 1·2·3) — 로그인 상태에서만 getMe를 조회해
 * `locationConsent=false`면 true를 돌려준다. 비로그인은 쿼리 미발사(enabled 게이트 —
 * 익명 401·reissue 재발사 방지 관례, MSG-328). 캐시 키는 getMeQueryKey와 동일해
 * 동의 PUT 성공의 invalidate가 이 관찰자를 재조회시켜 게이트가 해제된다 (기준 8).
 */
export const useLocationConsentGate = (): boolean => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
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
