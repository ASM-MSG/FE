/**
 * 스크롤 끝 근접 판정 (MSG-571 AC 8) — 웹 `RegionListView`의 sentinel(IntersectionObserver
 * 1px)을 RN ScrollView `onScroll` 지표로 대체한다.
 */

/** 끝 근접 임계 — 카드 반 장 높이 (스펙 추정 5) */
export const LOAD_MORE_THRESHOLD_PX = 80;

/** RN `NativeScrollEvent` 중 판정에 쓰는 표면만 */
export interface ScrollMetrics {
  contentOffset: { y: number };
  layoutMeasurement: { height: number };
  contentSize: { height: number };
}

/**
 * 남은 스크롤 거리가 임계 이하면 true — 콘텐츠가 뷰포트보다 짧으면(스크롤 불가) 항상 true.
 * 뷰포트·콘텐츠 높이가 아직 측정 전(0)이면 false — `onLayout`·`onContentSizeChange`는
 * 순서가 보장되지 않아 한쪽만 온 상태를 끝 도달로 보면 측정 전에 이어받기가 나간다
 * (codex 리뷰 P2-2).
 */
export const isNearScrollEnd = (
  { contentOffset, layoutMeasurement, contentSize }: ScrollMetrics,
  threshold: number,
): boolean =>
  layoutMeasurement.height > 0 &&
  contentSize.height > 0 &&
  contentSize.height - layoutMeasurement.height - contentOffset.y <= threshold;
