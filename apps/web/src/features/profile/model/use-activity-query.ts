import { useQuery } from "@tanstack/react-query";
import { useCollectionSummaryQuery } from "@/features/dex/model/use-collection-query";
import { entityQueryPolicy } from "@/features/map-home/model/map-query-policy";
import { unwrapEnvelope } from "@/shared/api/envelope";
import type { RegionStatResponseDto } from "@/shared/api/generated";
import { getStatsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { deriveCollectionRate } from "./activity-summary";

/**
 * 프로필 "내 활동" 조회 (MSG-395 — 사용자 요청 실 연동).
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 요약(`/api/collections/summary`)은 도감 훅을 그대로 재사용한다 — 같은 queryKey라
 * 도감을 들렀다 오면 캐시가 공유되고 요청이 늘지 않는다.
 * 행정동 통계(`/api/regions/stats`)는 파라미터 없이 부르면 내가 손댄 행정동 전부를 준다.
 *
 * 인증 게이트를 따로 걸지 않는다 — 프로필 라우트가 `RequireAuth`로 감싸여 있어
 * 비로그인 상태에서는 이 훅이 마운트되지 않는다(도감 훅과 같은 전제).
 */
export interface ActivityResult {
  /** 연속 기록 일수 — 미도착·실패면 null (카드가 `—`를 유지한다) */
  streakDays: number | null;
  /** 방문 행정동 합산 수집률(0~100) — 미도착·실패면 null */
  collectionRate: number | null;
}

/**
 * 상태 필드(isPending·isError·retry)를 내보내지 않는다 (codex 리뷰 반영):
 * 이 카드는 보조 정보라 실패를 별도 오류 UI로 키우면 프로필 본문(닉네임·설정)보다
 * 시끄러워지고, 프로필 조회 자체의 실패는 패널이 이미 재시도 화면으로 잡는다.
 * 쓰지 않을 상태를 계약에 남기면 "왜 안 쓰지"가 반복 질문이 된다 —
 * 실패는 값 없음(null → `—`)으로 수렴시키고, 회복은 쿼리 재시도·재진입이 맡는다.
 */

export const useActivityQuery = (): ActivityResult => {
  const summary = useCollectionSummaryQuery();
  const stats = useQuery({
    ...getStatsOptions(),
    select: (envelope): RegionStatResponseDto[] => unwrapEnvelope(envelope),
    ...entityQueryPolicy,
  });

  return {
    // 도착한 축만 값을 만든다 — 미도착·실패는 null이라 카드가 0%를 잠깐 보여주지 않는다
    streakDays: summary.data?.currentStreak ?? null,
    collectionRate: stats.data ? deriveCollectionRate(stats.data) : null,
  };
};
