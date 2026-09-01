import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getMeOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { UserProfileResponseDto } from "@/shared/api/generated";
import { useAuthStore } from "../model/auth-store";

/** 세션 역할 — 일반 사용자 / 행사 운영자 / 관리자 (생성 타입 파생) */
export type SessionRole = UserProfileResponseDto["role"];

export interface SessionRoleState {
  /** 확정된 세션 role — 비로그인·확정 전·조회 실패는 모두 null */
  role: SessionRole | null;
  /** 로그인 세션인데 role이 아직 확정되지 않은 구간 (가드의 자리표시 조건) */
  isPending: boolean;
}

/**
 * 세션 role 노출 훅 (MSG-541 AC 6) — 콘솔 가드가 읽는 role의 유일한 경로다.
 *
 * role의 정본은 `GET /api/users/me` 응답이다(추정 1): 로그인 응답(LoginResponseDto)에도
 * role이 있지만 auth-store에 persist하지 않는다 — 새로고침(토큰만 persist) 시에도 같은
 * 경로로 판정되어 일관되고, refreshToken을 body에서 무시하는 기존 관례와 정합이다.
 *
 * 캐시 키는 `getMeQueryKey`라 `useProfileQuery`와 캐시를 공유한다(중복 조회 없음) —
 * select만 다르므로 원본 봉투는 그대로 캐시된다.
 * 비로그인이면 쿼리를 발사하지 않는다(익명 401 + 재발급 재발사 방지 — MSG-328 관례).
 */
export const useSessionRole = (): SessionRoleState => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data, isPending } = useQuery({
    ...getMeOptions(),
    enabled: isAuthenticated,
    select: (envelope): SessionRole => unwrapEnvelope(envelope).role,
  });

  return {
    role: data ?? null,
    // enabled: false면 status가 영구 pending이라 인증 여부로 게이트한다 (gated-query 관례)
    isPending: isAuthenticated && isPending,
  };
};
