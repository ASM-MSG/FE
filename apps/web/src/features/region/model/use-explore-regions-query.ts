import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getExploreRegionsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { RegionGridCountResponseDto } from "@/shared/api/generated/types.gen";

export interface ExploreRegionsResult {
  /** 전체 지역 리스트(행정동명·격자 수) — 미도착이면 undefined */
  regions: RegionGridCountResponseDto[] | undefined;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * 전체 지역 리스트 조회 (MSG-328 AC 10) — `GET /api/regions/explore`.
 * "전체 보기" 모드에서만 활성화한다(enabled). 지도 SDK를 import하지 않는다(RN 경계).
 */
export const useExploreRegionsQuery = (
  enabled: boolean,
): ExploreRegionsResult => {
  const query = useQuery({
    ...getExploreRegionsOptions(),
    select: unwrapEnvelope,
    enabled,
  });

  return {
    regions: query.data,
    isPending: enabled && query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
};
