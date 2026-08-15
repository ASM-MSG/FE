import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { gatedQueryStatus } from "@/features/region/model/gated-query-status";
import type { MissionProgressResponseDto } from "@/shared/api/generated";
import { getMissionDetailOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { entityQueryPolicy } from "./map-query-policy";

/**
 * 미션 상세 조회 (MSG-403 AC 21) — `GET /api/missions/{missionId}`.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 상세 화면이 필요로 하던 세 값(진행도·영상 수·스팟별 방문/영상 수)을 서버가 한 번에 준다.
 * MSG-395는 이것들을 격자 단위 조회 여러 개로 조합했다 — 코스 스팟이 늘어날수록 요청이
 * 비례해 늘던 구조가 사라진다.
 */
export interface MissionSpotStat {
  visited: boolean;
  videoCount: number;
}

export interface MissionDetailResult {
  /** 격자 id → 스팟 통계 — 코스 상세의 `방문함/미방문`·`영상 N`의 근거 */
  spotStats: ReadonlyMap<string, MissionSpotStat>;
  progress: MissionProgressResponseDto | null;
  videoCount: number | null;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

const EMPTY_SPOT_STATS: ReadonlyMap<string, MissionSpotStat> = new Map();

export const useMissionDetailQuery = (
  missionId: number | null,
): MissionDetailResult => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const active = isAuthenticated && missionId !== null;

  const query = useQuery({
    ...getMissionDetailOptions({ path: { missionId: missionId ?? 0 } }),
    select: unwrapEnvelope,
    enabled: active,
    ...entityQueryPolicy,
  });

  const spotStats = useMemo(() => {
    if (query.data === undefined) return EMPTY_SPOT_STATS;
    return new Map(
      query.data.spotStats.map(({ gridId, visited, videoCount }) => [
        gridId,
        { visited, videoCount },
      ]),
    );
  }, [query.data]);

  return {
    spotStats,
    progress: query.data?.progress ?? null,
    videoCount: query.data?.videoCount ?? null,
    ...gatedQueryStatus(query, active),
  };
};
