import { useCallback } from "react";

/**
 * useInfiniteQuery "더 보기" 가드 콜백 (MSG-518) — 진행 중이거나 더 없으면 아무것도
 * 하지 않는다: cancelRefetch 기본값이 진행 중 요청을 재시작하기 때문. 이어받기 실패
 * 후에는 hasNextPage가 그대로 true라 이 호출이 곧 재시도다 (MSG-463 AC 6).
 * explore-regions(MSG-463)와 location-videos(MSG-518)로 두 번째 사용처가 생겨
 * 추출했다 (중복 게이트 검출 — gated-query-status·use-debounced-value 선례).
 * 플랫폼 API를 참조하지 않는다 — RN 경계.
 */
export const useLoadMore = (query: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}): (() => void) => {
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  return useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
};
