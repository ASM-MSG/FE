import { useInfiniteQuery } from "@tanstack/react-query";
import { getInboxInfiniteOptions } from "../../../shared/api/query-options";
import { useLoadMore } from "../../../shared/use-load-more";
import {
  inboxResult,
  nextInboxPageParam,
  type InboxResult,
} from "../model/inbox";

export interface InboxQueryResult extends InboxResult {
  /** 첫 페이지 실패 재시도 · 당겨서 새로고침 */
  refetch: () => Promise<unknown>;
  /** 새로고침 진행 중(이어받기 제외) — RefreshControl용 */
  isRefreshing: boolean;
  /** 다음 페이지 이어받기 — 진행 중이거나 더 없으면 무시. 이어받기 실패 후 재시도도 이것 */
  loadMore: () => void;
}

/**
 * 알림함 목록 (MSG-602) — `GET /api/notifications` 커서 무한 조회. explore-regions 배선 미러.
 * 첫 페이지는 **커서 없이** 요청한다 — pageParam이 number면 `cursor=`로 나가므로 객체 `{}`로 시작.
 */
export const useInboxQuery = (): InboxQueryResult => {
  const query = useInfiniteQuery({
    ...getInboxInfiniteOptions(),
    initialPageParam: {},
    getNextPageParam: nextInboxPageParam,
  });

  return {
    ...inboxResult(query),
    refetch: () => query.refetch(),
    isRefreshing: query.isRefetching && !query.isFetchingNextPage,
    loadMore: useLoadMore(query),
  };
};
