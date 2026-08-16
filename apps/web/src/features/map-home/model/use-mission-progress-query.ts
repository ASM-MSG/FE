import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { gatedQueryStatus } from "@/features/region/model/gated-query-status";
import type { MissionProgressResponseDto } from "@/shared/api/generated";
import { getMyProgressOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { entityQueryPolicy } from "./map-query-policy";

/**
 * 미션별 내 진행도 조회 (MSG-403 AC 20) — `GET /api/missions/progress?missionIds=`.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 목록에 뜬 미션들의 진행도를 **한 번에** 받는다(명세 상한 300개 — 한 화면 목록은 그 아래).
 * 조회 대상이 없으면 요청하지 않는다: 명세상 빈 배열 응답이라 오류는 아니지만, 칩을 켜기
 * 전부터 요청이 나갈 이유가 없다.
 */
export interface MissionProgressResult {
  /** 미션 id → 진행도. 서버가 모르는 id는 응답에서 빠지므로 `undefined`가 정상이다 */
  byMissionId: ReadonlyMap<number, MissionProgressResponseDto>;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

const EMPTY_MAP: ReadonlyMap<number, MissionProgressResponseDto> = new Map();

export const useMissionProgressQuery = (
  missionIds: number[],
): MissionProgressResult => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const active = isAuthenticated && missionIds.length > 0;

  const query = useQuery({
    ...getMyProgressOptions({ query: { missionIds } }),
    select: unwrapEnvelope,
    enabled: active,
    ...entityQueryPolicy,
  });

  const byMissionId = useMemo(() => {
    if (query.data === undefined) return EMPTY_MAP;
    return new Map(query.data.map((dto) => [dto.missionId, dto]));
  }, [query.data]);

  return {
    byMissionId,
    ...gatedQueryStatus(query, active),
  };
};
