import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/model/auth-store";
import type { CollectedVideo } from "@/entities/dex";
import { entityQueryPolicy } from "@/features/map-home/model/map-query-policy";
import { gatedQueryStatus } from "@/features/region/model/gated-query-status";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getRegionVideosOptions } from "@/shared/api/generated/@tanstack/react-query.gen";

export interface RegionVideosResult {
  /** 그 동에서 내가 수집한 영상 — 미도착이면 undefined */
  data: CollectedVideo[] | undefined;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * 동 단위 내 영상 조회 (MSG-327 기준 11·13·15) — `GET /api/collections/videos?regionCode=`.
 * regionCode가 null이면(동 미선택·by-grid 미도착·실패) 조회하지 않는다 — 비활성 쿼리는
 * 영원히 pending이라 gatedQueryStatus가 isPending을 눌러준다 (MSG-328 region 훅 관례).
 * MSG-474: 내 수집 영상은 사용자별 API(익명 401)라 비로그인도 발사하지 않는다 — 비로그인
 * 홈에서 행정동이 확정되면(핫구역 요약 경로) regionCode가 들어와도 401 스팸이 없어야 한다.
 * 지도 SDK를 import하지 않는다(RN 경계).
 */
export const useRegionVideosQuery = (
  regionCode: string | null,
): RegionVideosResult => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const enabled = isAuthenticated && regionCode !== null;

  const query = useQuery({
    ...getRegionVideosOptions({ query: { regionCode: regionCode ?? "" } }),
    select: (envelope): CollectedVideo[] => unwrapEnvelope(envelope),
    enabled,
    ...entityQueryPolicy,
  });

  return { data: query.data, ...gatedQueryStatus(query, enabled) };
};
