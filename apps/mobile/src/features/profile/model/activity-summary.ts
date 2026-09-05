import { clampPct } from "../../dex/model/dex-summary";

/**
 * 프로필 "내 활동" 파생 (MSG-564 — 웹 `features/profile/model/activity-summary.ts` 포팅,
 * parity 테스트가 고정한다). 순수 함수 — 플랫폼 API 무참조.
 *
 * - 스트릭: `GET /api/collections/summary`의 `currentStreak`
 * - 수집률: `GET /api/regions/stats`(내가 손댄 행정동 전부)의 격자 합산
 *
 * 수집률의 모수는 **전국 전체 격자가 아니라 내가 발 들인 행정동의 격자 합**이다(웹 MSG-395) —
 * 실계정에서 0.3% 같은 값이 정상이다(스펙 R5).
 */

/** 행정동 수집 통계의 필요한 부분만 — `RegionStatResponseDto`의 부분집합 */
interface RegionGridCounts {
  collectedCount: number;
  totalCount: number;
}

/** 방문한 행정동을 합산한 수집률(0~100). 방문이 없거나 모수가 0이면 0. */
export const deriveCollectionRate = (
  regions: readonly RegionGridCounts[],
): number => {
  const total = regions.reduce((sum, r) => sum + r.totalCount, 0);
  if (total === 0) return 0;

  const collected = regions.reduce((sum, r) => sum + r.collectedCount, 0);
  // 도감(clampPct)과 같은 방어 — 서버 수치가 어긋나도 100%를 넘겨 보이지 않는다
  return clampPct((collected / total) * 100);
};

/** 연속 기록 표시 — 도감 스탯 카드(`연속 스트릭`)와 같은 단위 표기 */
export const formatStreakDays = (days: number): string => `${days}일`;
