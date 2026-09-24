import { resolveListState, type ListState } from "./list-state";

/**
 * `useInfiniteQuery` 표면 → 화면이 읽는 목록 재료 (MSG-602에서 일반화).
 * explore-regions(MSG-571)·location-videos(MSG-560)가 같은 접기를 각자 들고 있다(허용
 * 중복 baseline) — 세 번째 용례가 생겨 제네릭으로 올린다. 기존 둘의 이관은 후속(DECISIONS).
 * 순수 함수 — 플랫폼·react 무의존.
 */
export interface InfiniteQuerySurface<TPage> {
  data: { pages: TPage[] } | undefined;
  isPending: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export interface InfiniteListResult<TItem> {
  /** 첫 페이지 미도착이면 undefined — 0건과 구분된다 */
  items: TItem[] | undefined;
  isPending: boolean;
  /** 첫 페이지 실패 — 목록 전체를 실패 안내로 대체한다. 이어받기 실패는 loadMoreFailed */
  isError: boolean;
  hasNext: boolean;
  isLoadingMore: boolean;
  /** 이어받기 실패 — 받은 목록은 유지하고 하단 다시 시도로만 재개한다 */
  loadMoreFailed: boolean;
}

export const infiniteListResult = <TPage, TItem>(
  query: InfiniteQuerySurface<TPage>,
  flatten: (pages: TPage[]) => TItem[],
): InfiniteListResult<TItem> => ({
  items: query.data === undefined ? undefined : flatten(query.data.pages),
  isPending: query.isPending,
  isError: query.isError && !query.isFetchNextPageError,
  hasNext: query.hasNextPage,
  isLoadingMore: query.isFetchingNextPage,
  // 재시도 중에는 TanStack이 isFetchingNextPage와 함께 실패 상태를 유지한다 — 로더와
  // 실패 안내가 동시에 그려지지 않도록 로딩이 우선한다 (explore-regions codex 재리뷰 P2)
  loadMoreFailed: query.isFetchNextPageError && !query.isFetchingNextPage,
});

/** 스크롤 자동 이어받기 허용 — 실패 시 자동 재시도 루프·진행 중 중복 트리거를 막는다 */
export const canAutoLoadMore = (
  result: Pick<
    InfiniteListResult<unknown>,
    "hasNext" | "isLoadingMore" | "loadMoreFailed"
  >,
): boolean => result.hasNext && !result.isLoadingMore && !result.loadMoreFailed;

/** 목록 4상태 — 첫 페이지 기준 (items undefined = 로딩 취급) */
export const infiniteListState = (
  result: Pick<InfiniteListResult<unknown>, "items" | "isPending" | "isError">,
): ListState =>
  resolveListState({
    isPending: result.isPending || result.items === undefined,
    isError: result.isError,
    items: result.items ?? [],
  });
