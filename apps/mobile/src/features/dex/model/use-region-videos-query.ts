import { useQuery } from "@tanstack/react-query";
import type { CollectedVideo } from "../../../entities/dex/model/dex";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { gatedQueryStatus } from "../../../shared/api/gated-query-status";
import { getRegionVideosOptions } from "../../../shared/api/query-options";

export interface RegionVideosResult {
  /** 그 동에서 내가 수집한 영상 — 미도착이면 undefined */
  data: CollectedVideo[] | undefined;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * 동 단위 내 영상 조회 (MSG-425 S7·S8) — `GET /api/collections/videos?regionCode=`.
 * 웹 `features/dex/model/use-region-videos-query.ts` 미러.
 * regionCode가 null이면(by-grid 미도착·실패·행정동 미판정) 조회하지 않는다 — 비활성
 * 쿼리는 영원히 pending이라 `gatedQueryStatus`가 isPending을 눌러준다(S12 회귀 방지).
 * RN 경계: 지도 SDK·라우터를 import하지 않는다.
 */
export const useRegionVideosQuery = (
  regionCode: string | null,
): RegionVideosResult => {
  const enabled = regionCode !== null;

  const query = useQuery({
    ...getRegionVideosOptions({ query: { regionCode: regionCode ?? "" } }),
    select: (envelope): CollectedVideo[] => unwrapEnvelope(envelope),
    enabled,
  });

  return { data: query.data, ...gatedQueryStatus(query, enabled) };
};
