import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getStatsOptions } from "../../../shared/api/query-options";
import type { RegionStatResponseDto } from "../../../shared/api/sdk";
import { useCollectionSummaryQuery } from "../../dex/model/use-collection-query";
import { deriveCollectionRate } from "../model/activity-summary";

/**
 * 프로필 "내 활동" 조회 (MSG-564 기준 13 — 웹 `use-activity-query` 미러).
 *
 * 요약(`/api/collections/summary`)은 도감 훅을 그대로 재사용한다 — 같은 queryKey라
 * 도감을 들렀다 오면 캐시가 공유되고 요청이 늘지 않는다.
 * 행정동 통계(`/api/regions/stats`)는 파라미터 없이 부르면 내가 손댄 행정동 전부를 준다.
 * staleTime은 전역 30초(결정 D10 — dex 훅과 같은 값, 두 축의 신선도를 갈라 둘 이유가 없다).
 * 인증 게이트는 `_layout`(MSG-561)이 담당한다. RN 경계: 지도 SDK·라우터를 import하지 않는다.
 */
export interface ActivityResult {
  /** 연속 기록 일수 — 미도착·실패면 null (카드가 `—`를 유지한다) */
  streakDays: number | null;
  /** 방문 행정동 합산 수집률(0~100) — 미도착·실패면 null */
  collectionRate: number | null;
}

/**
 * 상태 필드(isPending·isError·retry)를 내보내지 않는다 (웹 codex 리뷰 결정 미러):
 * 보조 정보라 실패를 별도 오류 UI로 키우지 않는다 — 값 없음(null → `—`)으로 수렴시키고,
 * 회복은 쿼리 재시도·재진입이 맡는다.
 */
export const useActivityQuery = (): ActivityResult => {
  const summary = useCollectionSummaryQuery();
  const stats = useQuery({
    ...getStatsOptions(),
    select: (envelope): RegionStatResponseDto[] => unwrapEnvelope(envelope),
  });

  return {
    // 도착한 축만 값을 만든다 — 미도착·실패는 null이라 카드가 0%를 잠깐 보여주지 않는다
    streakDays: summary.data?.currentStreak ?? null,
    collectionRate: stats.data ? deriveCollectionRate(stats.data) : null,
  };
};
