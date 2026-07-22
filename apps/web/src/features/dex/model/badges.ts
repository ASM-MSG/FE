import type { DexBadge } from "@/entities/dex";

/**
 * 뱃지 진열장 파생 로직 (MSG-123 AC 3·8).
 * 순수 함수 — 지도 SDK/플랫폼(window·router)에 의존하지 않는다(RN 재사용 대상).
 */

/** 뱃지 기본 프리뷰 개수 — 4열 × 2행 (티켓 명시값) */
export const BADGE_PREVIEW_LIMIT = 8;

/** 프리뷰 파생 결과 — 표시 목록 + "전체 보기" 노출 여부 (deriveGalleryPreview 패턴) */
export interface BadgePreview {
  badges: DexBadge[];
  /** 프리뷰 제한으로 잘린 항목이 있는가 — false면 전체 보기 링크·버튼을 표시하지 않는다 */
  hasMore: boolean;
}

/**
 * 정의 순서 입력에서 프리뷰 8개 + hasMore를 파생한다. [AC 3]
 * earned 여부는 파생에 무관 — 재정렬·필터 없이 앞 8개를 자른다(A2, 고정 카탈로그라
 * 획득 0개여도 비지 않는다 — AC 8).
 */
export const deriveBadgePreview = (badges: DexBadge[]): BadgePreview => ({
  badges: badges.slice(0, BADGE_PREVIEW_LIMIT),
  hasMore: badges.length > BADGE_PREVIEW_LIMIT,
});
