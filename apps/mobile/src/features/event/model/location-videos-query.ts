import { unwrapEnvelope } from "../../../shared/api/envelope";
import type {
  ApiResponseDtoEventLocationVideoPageResponseDto,
  EventLocationVideoResponseDto,
} from "../../../shared/api/sdk";

/**
 * 위치별 영상 피드의 순수 파생 (MSG-560 D13) — 웹 `use-location-videos-query.ts`의
 * 커서·평탄화 로직 포팅 + 쿼리 표면 → 시트 재료 접기. 훅(`api/use-location-videos-query`)은
 * useInfiniteQuery 배선만 남긴다 — 모바일에는 훅 렌더 테스트 인프라가 없어(vitest.config)
 * 판정을 순수 함수로 내려야 회귀 안전망이 생긴다.
 */
type VideoPage = ApiResponseDtoEventLocationVideoPageResponseDto;

/**
 * 다음 페이지 커서 — `hasNext=false`면 undefined로 중단, true면 서버 `nextCursor`를
 * 그대로 다음 요청 커서로 쓴다 (불투명 커서 — 해석 금지).
 */
export const nextLocationVideosPageParam = (
  lastPage: VideoPage,
): string | undefined => {
  const { hasNext, nextCursor } = unwrapEnvelope(lastPage);
  return hasNext ? (nextCursor ?? undefined) : undefined;
};

/** 수집한 페이지들을 응답(최신순) 순서대로 이어붙인 단일 목록 */
export const flattenLocationVideoPages = (
  pages: VideoPage[] | undefined,
): EventLocationVideoResponseDto[] =>
  (pages ?? []).flatMap((page) => unwrapEnvelope(page).videos);

/** `useInfiniteQuery` 결과 중 파생에 쓰는 표면만 */
export interface LocationVideosQuerySurface {
  data: { pages: VideoPage[] } | undefined;
  isPending: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export interface LocationVideosResult {
  /** 첫 페이지 미도착이면 undefined — 0건(빈 위치)과 구분된다 */
  videos: EventLocationVideoResponseDto[] | undefined;
  /** 빈 위치 판정 — `eventRoomMode` 입력 */
  hasLocationVideos: boolean;
  isPending: boolean;
  /** 첫 페이지 실패 — 본문 전체를 재시도로 대체한다. 이어받기 실패는 제외 */
  isError: boolean;
  hasNext: boolean;
  isLoadingMore: boolean;
}

export const locationVideosResult = (
  query: LocationVideosQuerySurface,
  active: boolean,
): LocationVideosResult => {
  const videos =
    query.data === undefined
      ? undefined
      : flattenLocationVideoPages(query.data.pages);

  return {
    videos,
    hasLocationVideos: (videos?.length ?? 0) > 0,
    // 비활성(게이트 false) 쿼리는 영원히 pending이라 게이트로 눌러준다
    isPending: active && query.isPending,
    // 이어받기 실패를 전면 실패로 승격하지 않는다 — 받은 목록 유지 + hasNext 잔존이라
    // `더 보기` 재탭이 곧 재시도다 (웹 codex 리뷰 P2와 같은 처리)
    isError: query.isError && !query.isFetchNextPageError,
    hasNext: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
  };
};
