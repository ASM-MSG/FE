import type { DexBadge } from "@/entities/dex";

/**
 * 뱃지 진열장 표시 순서·프리뷰 파생 (MSG-327 기준 17).
 * 순수 함수 — 지도 SDK/플랫폼(window·router)에 의존하지 않는다(RN 재사용 대상).
 * 구 `badges.ts`(정의 순서 앞 8개)를 대체한다 — 순서 규칙은 Figma 뱃지 시안(14599:11390)의
 * "진열장 8칸 구성 제안: 대표 뱃지(featured_rank 1·2) 먼저, 나머지는 최근 획득순".
 */

/** 진열장 기본 프리뷰 개수 — 4열 × 2행 (Figma 진열장 14599:12529) */
export const BADGE_PREVIEW_LIMIT = 8;

/** 정렬 그룹 — 낮을수록 앞 (대표 → 획득 → 미획득) */
const rankOf = (badge: DexBadge): number => {
  if (badge.featuredRank !== null && badge.featuredRank !== undefined) return 0;
  return badge.earned ? 1 : 2;
};

/**
 * 진열장 표시 순서로 정렬한다. [기준 17]
 * - 대표 뱃지: featuredRank 오름차순(1·2)
 * - 그 외 획득: earnedAt 내림차순(최근 획득 먼저) — earnedAt이 없으면 뒤로
 * - 미획득: 카탈로그 정의 순서 유지 (고정 카탈로그라 획득 0개여도 진열장이 비지 않는다)
 * 원본 배열은 변형하지 않는다.
 */
export const orderBadges = (badges: DexBadge[]): DexBadge[] =>
  badges
    .map((badge, index) => ({ badge, index }))
    .sort((a, b) => {
      const group = rankOf(a.badge) - rankOf(b.badge);
      if (group !== 0) return group;

      if (rankOf(a.badge) === 0) {
        return (a.badge.featuredRank ?? 0) - (b.badge.featuredRank ?? 0);
      }
      if (rankOf(a.badge) === 1) {
        return (b.badge.earnedAt ?? "").localeCompare(a.badge.earnedAt ?? "");
      }
      return a.index - b.index;
    })
    .map(({ badge }) => badge);
