import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getProfileOptions } from "@/shared/api/generated/@tanstack/react-query.gen";

/**
 * 운영자 계정 프로필 조회 (MSG-545 AC 10) — `GET /api/org/profile`.
 *
 * 응답은 `email`·`contactName`·`contactPhone`뿐이다 — **조직명 필드가 없다**(실측:
 * orgName은 계정 발급 요청 DTO에만 존재). 사이드바가 조직명을 렌더하지 않는 근거다.
 *
 * 비로그인이면 발사하지 않는다: 콘솔 셸은 가드 밖(스토리·테스트)에서도 마운트되고,
 * 익명 401 + 재발급 재발사를 만들 이유가 없다 (use-session-role과 같은 관례).
 * 실패는 던지지 않고 사이드바가 이메일만 생략한다 — 셸 나머지는 그대로 렌더된다.
 *
 * MSG-544(계정 설정)가 그대로 재사용할 자산이다.
 */
export const useOrgProfileQuery = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    ...getProfileOptions(),
    select: unwrapEnvelope,
    enabled: isAuthenticated,
  });
};
