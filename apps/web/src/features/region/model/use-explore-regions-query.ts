import { useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getExploreRegionsInfiniteOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type {
  ApiResponseDtoRegionExplorePageResponseDto,
  RegionGridCountResponseDto,
} from "@/shared/api/generated/types.gen";

type ExplorePage = ApiResponseDtoRegionExplorePageResponseDto;

/**
 * 다음 페이지 커서 파생 (MSG-463 AC 3) — `hasNext=false`면 undefined로 중단,
 * true면 서버 `nextCursor`를 그대로 다음 요청 커서로 쓴다 (불투명 커서 — 해석 금지).
 */
export const nextExploreRegionsPageParam = (
  lastPage: ExplorePage,
): string | undefined => {
  const { hasNext, nextCursor } = unwrapEnvelope(lastPage);
  return hasNext ? (nextCursor ?? undefined) : undefined;
};

/** 수집한 페이지들을 응답 순서대로 이어붙인 단일 지역 목록 (AC 3) — 중복 제거는 하지 않는다(서버 커서 계약 신뢰) */
export const flattenExploreRegionPages = (
  pages: ExplorePage[] | undefined,
): RegionGridCountResponseDto[] =>
  (pages ?? []).flatMap((page) => unwrapEnvelope(page).items);

export interface ExploreRegionsResult {
  /** 지금까지 받은 전체 지역 리스트(행정동명·격자 수, 평탄화) — 첫 페이지 미도착이면 undefined */
  regions: RegionGridCountResponseDto[] | undefined;
  isPending: boolean;
  /** 첫 페이지 실패 — 목록 전체를 실패 안내로 대체한다. 이어받기 실패는 loadMoreFailed */
  isError: boolean;
  retry: () => void;
  /** 다음 페이지 존재 여부 — false면 스크롤 끝에서 더 요청하지 않는다 (AC 4) */
  hasNext: boolean;
  /** 다음 페이지 이어받기 — 진행 중이거나 더 없으면 아무것도 하지 않는다 */
  loadMore: () => void;
  isLoadingMore: boolean;
  /** 이어받기 실패 — 받은 목록은 유지하고 하단 재시도(loadMore)로 재개한다 (AC 6) */
  loadMoreFailed: boolean;
}

/**
 * 전체 지역 리스트 조회 (MSG-328 AC 10 → MSG-463 무한 스크롤) — `GET /api/regions/explore`.
 * 커서 페이지(`items`·`hasNext`·`nextCursor`) 계약을 useInfiniteQuery로 이어받는다 (MSG-460
 * 서버 레인). 인증 게이트는 없다 — MSG-454로 익명 조회가 허용됐다. 마운트 자체가
 * "전체 보기" 모드에서만 일어나므로(RegionListView) 별도 활성 조건도 없다.
 * 지도 SDK를 import하지 않는다(RN 경계).
 */
export const useExploreRegionsQuery = (): ExploreRegionsResult => {
  const query = useInfiniteQuery({
    ...getExploreRegionsInfiniteOptions(),
    // 첫 페이지는 **커서 없이** 요청한다. 생성 queryFn은 pageParam이 문자열이면 `cursor`
    // 쿼리로 싣는데, 빈 문자열이면 `cursor=`가 그대로 나가 서버가 400으로 거부한다
    // (use-occupied-grids-query 브라우저 실측). 객체 형태로 주면 커서 없이 나간다
    initialPageParam: {},
    getNextPageParam: nextExploreRegionsPageParam,
  });

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  const loadMore = useCallback(() => {
    // 진행 중 재호출을 막는다 — cancelRefetch 기본값이 진행 중 요청을 재시작한다.
    // 실패 후에는 hasNextPage가 그대로 true라 이 호출이 곧 재시도다 (AC 6)
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return {
    regions:
      query.data === undefined
        ? undefined
        : flattenExploreRegionPages(query.data.pages),
    isPending: query.isPending,
    // 이어받기 실패를 전체 실패로 승격하지 않는다 — 받은 목록은 유지한다 (AC 6)
    isError: query.isError && !query.isFetchNextPageError,
    retry: () => void query.refetch(),
    hasNext: query.hasNextPage,
    loadMore,
    isLoadingMore: query.isFetchingNextPage,
    loadMoreFailed: query.isFetchNextPageError,
  };
};
