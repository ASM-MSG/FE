import { clampPct } from "@/features/dex/model/dex-summary";

/**
 * 프로필 "내 활동" 파생 (MSG-395 — 사용자 요청 실 연동).
 * 순수 함수 — 지도 SDK/플랫폼(window·router)에 의존하지 않는다(RN 재사용 대상).
 *
 * MSG-329는 이 두 값을 `—`로 두고 "도감 API 유도값으로 채우는 판단은 MSG-327 몫"이라
 * 미뤘고, MSG-327은 손대지 않았다. 여기서 채운다:
 * - 스트릭: `GET /api/collections/summary`의 `currentStreak`
 * - 수집률: `GET /api/regions/stats`(내가 손댄 행정동 전부)의 격자 합산
 *
 * 수집률의 모수는 **전국 전체 격자가 아니라 내가 발 들인 행정동의 격자 합**이다 —
 * 전국 격자 수를 주는 축이 명세에 없고, 있다 해도 분모가 수십만이라 화면에 늘 0%가 뜬다.
 * 도감의 행정동 단위 "탐험률"(progressRate)을 계정 전체로 넓힌 것과 같은 의미다.
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
