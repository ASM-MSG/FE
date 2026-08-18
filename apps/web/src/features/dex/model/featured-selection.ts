import type { DexBadge } from "@/entities/dex";

/**
 * 대표 뱃지 편집모드 선택 로직 (MSG-413 기준 3·4).
 * 순수 함수 — 플랫폼(window·router)에 의존하지 않는다(RN 재사용 대상).
 * 선택은 badgeId 배열로 표현하고 **배열 순서가 곧 랭크(1·2)이자 PUT badgeIds의
 * 표시 순서**다 — 별도 직렬화 함수가 필요 없다(FeaturedBadgeRequestDto 주석:
 * "배열 순서 = 표시 순서, 빈 배열 = 전부 해제").
 */

/** 대표 뱃지 최대 개수 — 서버 스키마 명시(최대 2개) */
export const MAX_FEATURED = 2;

/** 서버 featuredRank(1·2)에서 초기 선택을 랭크 순 badgeId 배열로 파생한다 [기준 3] */
export const initialFeaturedSelection = (badges: DexBadge[]): number[] =>
  badges
    .filter(
      (badge) =>
        badge.featuredRank !== null && badge.featuredRank !== undefined,
    )
    .sort((a, b) => (a.featuredRank ?? 0) - (b.featuredRank ?? 0))
    .map((badge) => badge.badgeId);

/**
 * 획득 뱃지 클릭 토글 [기준 3·4] —
 * 미획득 클릭·2개 찬 상태의 추가 클릭은 무시(원본 배열 그대로 반환).
 * 해제는 배열에서 제거 — rank 1 해제 시 잔여 선택이 자연히 rank 1로 승격된다.
 */
export const toggleFeatured = (
  selection: number[],
  badge: DexBadge,
): number[] => {
  if (!badge.earned) return selection;
  if (selection.includes(badge.badgeId)) {
    return selection.filter((id) => id !== badge.badgeId);
  }
  if (selection.length >= MAX_FEATURED) return selection;
  return [...selection, badge.badgeId];
};

/** 선택 배열에서 랭크(1·2) 조회 — 미선택이면 null [기준 2] */
export const featuredRankOf = (
  selection: number[],
  badgeId: number,
): number | null => {
  const index = selection.indexOf(badgeId);
  return index === -1 ? null : index + 1;
};
