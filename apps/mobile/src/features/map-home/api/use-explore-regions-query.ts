import { useInfiniteQuery } from "@tanstack/react-query";
import { getExploreRegionsInfiniteOptions } from "../../../shared/api/query-options";
import { useLoadMore } from "../../../shared/use-load-more";
import {
  exploreRegionsResult,
  nextExploreRegionsPageParam,
  type ExploreRegionsResult,
} from "../model/explore-regions-query";

export interface ExploreRegionsQueryResult extends ExploreRegionsResult {
  /** 첫 페이지 실패 재시도 */
  retry: () => void;
  /** 다음 페이지 이어받기 — 진행 중이거나 더 없으면 아무것도 하지 않는다. 이어받기 실패 후 재시도도 이것 */
  loadMore: () => void;
}

/**
 * 전체 지역 목록 조회 (MSG-571) — `GET /api/regions/explore`. 웹 `useExploreRegionsQuery`
 * 이식. 인증 게이트 없음(앱은 로그인 필수), `enabled` 없음 — 목록 컴포넌트 마운트가
 * 곧 조회 시작이다(웹 `RegionListView` 관례, 추정 7).
 */
export const useExploreRegionsQuery = (): ExploreRegionsQueryResult => {
  const query = useInfiniteQuery({
    ...getExploreRegionsInfiniteOptions(),
    // 첫 페이지는 **커서 없이** 요청한다 — 문자열 pageParam은 `cursor=`로 나가 빈 문자열이면
    // 서버가 400으로 거부한다(웹 실측). 객체 형태면 커서 없이 나간다
    initialPageParam: {},
    getNextPageParam: nextExploreRegionsPageParam,
  });

  return {
    ...exploreRegionsResult(query),
    retry: () => void query.refetch(),
    loadMore: useLoadMore(query),
  };
};
