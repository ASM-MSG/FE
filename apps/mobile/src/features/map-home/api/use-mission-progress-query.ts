import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getMyProgressOptions } from "../../../shared/api/query-options";
import type { MissionProgressResponseDto } from "../../../shared/api/sdk";
import { useAuth } from "../../auth/model/auth-session";
import {
  gatedQueryStatus,
  type GatedQueryStatus,
} from "../model/home-sheet-state";
import { entityQueryPolicy } from "../model/map-query-policy";
import { missionProgressQueryArgs } from "../model/mission-query-args";

/**
 * 미션별 내 진행도 조회 (MSG-427 D2) — `GET /api/missions/progress?missionIds=`.
 * 웹 `use-mission-progress-query.ts` 이식. 지도 SDK를 import하지 않는다.
 *
 * 목록에 뜬 미션들의 진행도를 **한 번에** 받는다 — 미션당 호출이 아니다.
 * 요청 인자·게이트 판정은 순수 모델(`missionProgressQueryArgs`)이 갖는다.
 */
export interface MissionProgressResult extends GatedQueryStatus {
  /** 미션 id → 진행도. 서버가 모르는 id는 응답에서 빠지므로 `undefined`가 정상이다 */
  byMissionId: ReadonlyMap<number, MissionProgressResponseDto>;
}

const EMPTY_MAP: ReadonlyMap<number, MissionProgressResponseDto> = new Map();

export const useMissionProgressQuery = (
  missionIds: number[],
): MissionProgressResult => {
  const { isAuthenticated, hydrated } = useAuth();
  const { query, enabled } = missionProgressQueryArgs(missionIds);
  const active = enabled && isAuthenticated;

  const queryResult = useQuery({
    ...getMyProgressOptions({ query }),
    select: unwrapEnvelope,
    enabled: active,
    ...entityQueryPolicy,
  });

  const byMissionId = useMemo(() => {
    if (queryResult.data === undefined) return EMPTY_MAP;
    return new Map(queryResult.data.map((dto) => [dto.missionId, dto]));
  }, [queryResult.data]);

  return { byMissionId, ...gatedQueryStatus(queryResult, active, hydrated) };
};
