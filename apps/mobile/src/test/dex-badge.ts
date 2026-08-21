import type { DexBadge } from "../entities/dex/model/dex";

/**
 * 테스트 전용 뱃지 픽스처 팩토리 — 뱃지 순서·대표 선택 테스트 4개가 같은 기본값 위에서
 * 필드 몇 개만 바꿔 쓰므로 공용으로 둔다 (envelope-response 선례).
 * 기본값은 "미획득·대표 아님"이다 — 각 테스트가 관심 있는 필드만 덮어쓴다.
 */
export const dexBadge = (
  over: Partial<DexBadge> & Pick<DexBadge, "badgeId">,
): DexBadge => ({
  code: `CODE_${over.badgeId}`,
  name: `뱃지 ${over.badgeId}`,
  earned: false,
  iconUrl: null,
  earnedAt: null,
  featuredRank: null,
  ...over,
});
