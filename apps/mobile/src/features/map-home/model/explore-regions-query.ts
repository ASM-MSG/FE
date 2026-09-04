import { unwrapEnvelope } from "../../../shared/api/envelope";
import type {
  ApiResponseDtoRegionExplorePageResponseDto,
  RegionGridCountResponseDto,
} from "../../../shared/api/sdk";

/**
 * 전체 지역 목록의 순수 파생 (MSG-571 AC 7~9) — 웹 `use-explore-regions-query.ts`의
 * 커서·평탄화 로직 포팅 + 쿼리 표면 → 시트 재료 접기 (`location-videos-query` 선례).
 * 훅(`api/use-explore-regions-query`)은 useInfiniteQuery 배선만 남긴다.
 */
type ExplorePage = ApiResponseDtoRegionExplorePageResponseDto;

/** 다음 페이지 커서 — `hasNext=false`면 undefined로 중단, true면 서버 `nextCursor` 그대로 (불투명 커서) */
export const nextExploreRegionsPageParam = (
  lastPage: ExplorePage,
): string | undefined => {
  const { hasNext, nextCursor } = unwrapEnvelope(lastPage);
  return hasNext ? (nextCursor ?? undefined) : undefined;
};

/** 수집한 페이지들을 응답 순서대로 이어붙인 단일 목록 — 정렬·중복 제거 없음 (서버 커서 계약 신뢰) */
export const flattenExploreRegionPages = (
  pages: ExplorePage[] | undefined,
): RegionGridCountResponseDto[] =>
  (pages ?? []).flatMap((page) => unwrapEnvelope(page).items);

/** `useInfiniteQuery` 결과 중 파생에 쓰는 표면만 */
export interface ExploreRegionsQuerySurface {
  data: { pages: ExplorePage[] } | undefined;
  isPending: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export interface ExploreRegionsResult {
  /** 첫 페이지 미도착이면 undefined — 0건과 구분된다 */
  regions: RegionGridCountResponseDto[] | undefined;
  isPending: boolean;
  /** 첫 페이지 실패 — 목록 전체를 실패 안내로 대체한다. 이어받기 실패는 loadMoreFailed */
  isError: boolean;
  hasNext: boolean;
  isLoadingMore: boolean;
  /** 이어받기 실패 — 받은 목록은 유지하고 하단 다시 시도로만 재개한다 */
  loadMoreFailed: boolean;
}

export const exploreRegionsResult = (
  query: ExploreRegionsQuerySurface,
): ExploreRegionsResult => ({
  regions:
    query.data === undefined
      ? undefined
      : flattenExploreRegionPages(query.data.pages),
  isPending: query.isPending,
  isError: query.isError && !query.isFetchNextPageError,
  hasNext: query.hasNextPage,
  isLoadingMore: query.isFetchingNextPage,
  // 재시도 중에는 TanStack이 isFetchingNextPage와 함께 실패 상태를 유지한다 — 로더와
  // 실패 안내가 동시에 그려지지 않도록 로딩이 우선한다 (codex 재리뷰 P2, 웹과 다른 지점)
  loadMoreFailed: query.isFetchNextPageError && !query.isFetchingNextPage,
});

/**
 * 스크롤 자동 이어받기 허용 여부 — 웹 `showSentinel` 미러. 실패 시 자동 재시도 루프를
 * 막고(재개는 다시 시도만), 진행 중 중복 트리거를 막는다.
 */
export const autoLoadMoreEnabled = (
  result: Pick<
    ExploreRegionsResult,
    "hasNext" | "isLoadingMore" | "loadMoreFailed"
  >,
): boolean => result.hasNext && !result.isLoadingMore && !result.loadMoreFailed;
