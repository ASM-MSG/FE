import type { DexBadge } from "../../../entities/dex/model/dex";

/**
 * 뱃지 진열장 표시 순서·프리뷰 파생 (MSG-430 L1·L2) — 웹
 * `features/dex/model/badge-showcase.ts` 미러(parity 테스트가 고정).
 * 순수 함수 — RN·플랫폼 API에 의존하지 않는다.
 */

/** 진열장 기본 프리뷰 개수 — 4열 × 2행 */
export const BADGE_PREVIEW_LIMIT = 8;

/** 정렬 그룹 — 낮을수록 앞 (대표 → 획득 → 미획득) */
const rankOf = (badge: DexBadge): number => {
  if (badge.featuredRank !== null && badge.featuredRank !== undefined) return 0;
  return badge.earned ? 1 : 2;
};

/**
 * 헤더·미리보기용 대표 뱃지 파생 [L2] — featuredRank 보유분만 rank 오름차순
 * `{id, name}`으로 좁힌다. 대표 0개·빈 카탈로그(로딩·에러 폴백 입력)는 빈 배열이다.
 */
export const featuredBadgesOf = (
  badges: DexBadge[],
): { id: number; name: string }[] =>
  badges
    .filter(
      (badge) =>
        badge.featuredRank !== null && badge.featuredRank !== undefined,
    )
    .sort((a, b) => (a.featuredRank ?? 0) - (b.featuredRank ?? 0))
    .map((badge) => ({ id: badge.badgeId, name: badge.name }));

/**
 * 진열장 표시 순서로 정렬한다. [L1]
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
