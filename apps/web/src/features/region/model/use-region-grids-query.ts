import { useQuery } from "@tanstack/react-query";
import { entityQueryPolicy } from "@/features/map-home/model/map-query-policy";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getRegionGridsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { RegionExploreResponseDto } from "@/shared/api/generated/types.gen";

/** 격자 카드 리스트 상한 — 사용자 확정(2026-08-13): 세로 스크롤 리스트 20장 */
export const REGION_GRIDS_LIMIT = 20;

export interface RegionGridsResult {
  /** 격자 카드 리스트 + 헤더 카운트 — 미도착이면 undefined */
  data: RegionExploreResponseDto | undefined;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * 행정동 격자 카드 조회 (MSG-328 AC 4·5) — `GET /api/regions/{regionCode}/grids`.
 * 정렬·상한은 사용자 확정값 sort=LATEST·limit=20을 명시한다. regionCode가 null이면
 * (행정동 밖·표시 지역 미채택·비로그인 게이트) 조회하지 않는다 (AC 12).
 * 지도 SDK를 import하지 않는다(RN 경계).
 */
export const useRegionGridsQuery = (
  regionCode: string | null,
): RegionGridsResult => {
  const enabled = regionCode !== null;

  const query = useQuery({
    ...getRegionGridsOptions({
      path: { regionCode: regionCode ?? "" },
      query: { sort: "LATEST", limit: REGION_GRIDS_LIMIT },
    }),
    select: unwrapEnvelope,
    enabled,
    ...entityQueryPolicy,
  });

  return {
    data: query.data,
    // 비활성(regionCode null) 쿼리는 영원히 pending이라 enabled로 게이트한다
    isPending: enabled && query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
};
