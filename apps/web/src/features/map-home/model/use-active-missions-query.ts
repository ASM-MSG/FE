import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getActiveMissionsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { entityQueryPolicy } from "./map-query-policy";
import { toMissionBuckets, type MissionBuckets } from "./mission";

/**
 * 활성 미션 조회 (MSG-395 AC 1·26) — `GET /api/missions/active`.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 뷰포트 파라미터가 없는 전역 목록이라 뷰포트 정책(keepPreviousData)이 아니라 단일
 * 엔티티 정책을 쓴다. 인증 게이트를 걸지 않는다 — 축제·팝업·코스는 로그인 없이도
 * 보여야 하는 공개 정보라는 전제다(스펙 AC 28은 핫구역·수집 격자만 게이트 대상으로 둔다).
 */
export interface ActiveMissionsResult {
  buckets: MissionBuckets;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

const EMPTY_BUCKETS: MissionBuckets = {
  festival: [],
  popup: [],
  route: [],
};

export const useActiveMissionsQuery = (): ActiveMissionsResult => {
  const query = useQuery({
    ...getActiveMissionsOptions(),
    select: unwrapEnvelope,
    ...entityQueryPolicy,
  });

  // 매 렌더 새 객체면 소비처의 목록 파생(진행도 계산·오버레이 조립) 메모가 통째로 무효화된다
  const buckets = useMemo(
    () => (query.data ? toMissionBuckets(query.data) : EMPTY_BUCKETS),
    [query.data],
  );

  return {
    buckets,
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
};
