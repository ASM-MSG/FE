import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getZonesOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { ZoneResponseDto } from "@/shared/api/generated/types.gen";

const EMPTY_ZONES: ZoneResponseDto[] = [];

/**
 * 전체 구역 목록 조회 (MSG-412 AC 4) — `GET /api/zones`, 48건 수준 정적 목록.
 * 보호 API(bearer 필수 — 익명 401 관례): 비로그인은 조회하지 않는다.
 * staleTime·gcTime Infinity — 로그인 상태의 검색박스 마운트 시 1회만 요청하고(승인 결정)
 * 재마운트·재입력에도 세션 내 재요청이 없다. 시딩 전이면 빈 배열(격자 섹션 미노출 — AC 3).
 * 지도 SDK를 import하지 않는다(RN 경계).
 */
export const useZonesQuery = (): ZoneResponseDto[] => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data } = useQuery({
    ...getZonesOptions(),
    select: unwrapEnvelope,
    enabled: isAuthenticated,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data ?? EMPTY_ZONES;
};
