import type { DexBadge } from "../../../entities/dex/model/dex";

/**
 * 대표 뱃지 편집 모드 선택 로직 (MSG-430 L3) — 웹
 * `features/dex/model/featured-selection.ts` 미러(parity 테스트가 고정).
 * 선택은 badgeId 배열로 표현하고 **배열 순서가 곧 랭크(1·2)이자 PUT badgeIds의
 * 표시 순서**다 — 별도 직렬화 함수가 필요 없다(FeaturedBadgeRequestDto 주석:
 * "배열 순서 = 표시 순서, 빈 배열 = 전부 해제").
 * 순수 함수 — RN·플랫폼 API에 의존하지 않는다.
 */

/** 대표 뱃지 최대 개수 — 서버 스키마 명시(최대 2개) */
export const MAX_FEATURED = 2;

/** 서버 featuredRank(1·2)에서 초기 선택을 랭크 순 badgeId 배열로 파생한다 [L3] */
export const initialFeaturedSelection = (badges: DexBadge[]): number[] =>
  badges
    .filter(
      (badge) =>
        badge.featuredRank !== null && badge.featuredRank !== undefined,
    )
    .sort((a, b) => (a.featuredRank ?? 0) - (b.featuredRank ?? 0))
    .map((badge) => badge.badgeId);

/**
 * 획득 뱃지 탭 토글 [L3 → MSG-451 AC 22] — 미획득 탭은 무시(원본 배열 그대로 반환).
 * 해제는 배열에서 제거 — rank 1 해제 시 잔여 선택이 자연히 rank 1로 승격된다.
 *
 * **찬 상태의 추가 탭은 FIFO 교체다**(MSG-451, 웹 원본과 동시 개정): 종전에는 무시라
 * 두 개를 채운 뒤에는 세 번째 뱃지가 아무 반응이 없었고, 바꾸려면 먼저 해제해야 하는 것을
 * 화면이 알려주지 않았다. 배열 순서가 곧 랭크이므로 앞(오래된 선택)을 잘라내면 잔여가
 * rank 1로 승격되고 새 뱃지가 rank 2가 된다 — 해제 경로의 승격 규칙과 같은 산술이다.
 * 안내 문구 갱신은 MSG-430 화면 몫 (지라 환류).
 */
export const toggleFeatured = (
  selection: number[],
  badge: DexBadge,
): number[] => {
  if (!badge.earned) return selection;
  if (selection.includes(badge.badgeId)) {
    return selection.filter((id) => id !== badge.badgeId);
  }
  return [...selection.slice(-(MAX_FEATURED - 1)), badge.badgeId];
};

/** 선택 배열에서 랭크(1·2) 조회 — 미선택이면 null [L3] */
export const featuredRankOf = (
  selection: number[],
  badgeId: number,
): number | null => {
  const index = selection.indexOf(badgeId);
  return index === -1 ? null : index + 1;
};
