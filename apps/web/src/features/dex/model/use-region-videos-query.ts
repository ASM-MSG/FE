import { useQuery } from "@tanstack/react-query";
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
 * 지도 SDK를 import하지 않는다(RN 경계).
 */
export const useRegionVideosQuery = (
  regionCode: string | null,
): RegionVideosResult => {
  const enabled = regionCode !== null;

  const query = useQuery({
    ...getRegionVideosOptions({ query: { regionCode: regionCode ?? "" } }),
    select: (envelope): CollectedVideo[] => unwrapEnvelope(envelope),
    enabled,
    ...entityQueryPolicy,
  });

  return { data: query.data, ...gatedQueryStatus(query, enabled) };
};
