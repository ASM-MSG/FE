import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getMissionDetailOptions } from "../../../shared/api/query-options";
import { useAuth } from "../../auth/model/auth-session";
import {
  gatedQueryStatus,
  type GatedQueryStatus,
} from "../model/home-sheet-state";
import { entityQueryPolicy } from "../model/map-query-policy";
import {
  deriveMissionDetailStats,
  type MissionDetailStats,
} from "../model/mission-detail-view";

/**
 * 미션 상세 조회 (MSG-427 D10·D12·E10·E11) — `GET /api/missions/{missionId}`.
 * 웹 `use-mission-detail-query.ts` 이식. 지도 SDK를 import하지 않는다.
 *
 * 상세 화면이 필요로 하는 세 값(진행도·영상 수·스팟별 방문/영상 수)을 서버가 한 번에 준다 —
 * 격자 단위 조회 여러 개로 조합할 필요가 없다. 파생은 순수 모델(`mission-detail-view`)이 한다.
 */
export interface MissionDetailResult extends GatedQueryStatus {
  stats: MissionDetailStats;
}

export const useMissionDetailQuery = (
  missionId: number | null,
): MissionDetailResult => {
  const { isAuthenticated, hydrated } = useAuth();
  const active = isAuthenticated && missionId !== null;

  const query = useQuery({
    ...getMissionDetailOptions({ path: { missionId: missionId ?? 0 } }),
    select: unwrapEnvelope,
    enabled: active,
    ...entityQueryPolicy,
  });

  const stats = useMemo(
    () => deriveMissionDetailStats(query.data),
    [query.data],
  );

  return { stats, ...gatedQueryStatus(query, active, hydrated) };
};
