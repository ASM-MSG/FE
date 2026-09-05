import { useInfiniteQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { useLoadMore } from "@/shared/use-load-more";
import { getLocationVideosInfiniteOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type {
  ApiResponseDtoEventLocationVideoPageResponseDto,
  EventLocationVideoResponseDto,
} from "@/shared/api/generated/types.gen";

type VideoPage = ApiResponseDtoEventLocationVideoPageResponseDto;

/**
 * 다음 페이지 커서 파생 (MSG-518 AC 10) — `hasNext=false`면 undefined로 중단,
 * true면 서버 `nextCursor`를 그대로 다음 요청 커서로 쓴다 (불투명 커서 — 해석 금지,
 * explore-regions 선례).
 */
export const nextLocationVideosPageParam = (
  lastPage: VideoPage,
): string | undefined => {
  const { hasNext, nextCursor } = unwrapEnvelope(lastPage);
  return hasNext ? (nextCursor ?? undefined) : undefined;
};

/** 수집한 페이지들을 응답(최신순) 순서대로 이어붙인 단일 영상 목록 (AC 5) */
export const flattenLocationVideoPages = (
  pages: VideoPage[] | undefined,
): EventLocationVideoResponseDto[] =>
  (pages ?? []).flatMap((page) => unwrapEnvelope(page).videos);

/** 조회 대상 — 행사방(occurrenceId) + 선택 위치(locationId). null이면 미발사 */
export interface LocationVideosTarget {
  occurrenceId: number;
  locationId: number;
}

export interface LocationVideosResult {
  /** 지금까지 받은 전체 영상(평탄화, 최신순) — 첫 페이지 미도착이면 undefined */
  videos: EventLocationVideoResponseDto[] | undefined;
  /** 빈 위치 판정 (AC 7) — 첫 페이지 0건이면 false. event-room-mode 입력 슬롯 */
  hasLocationVideos: boolean;
  isPending: boolean;
  /** 첫 페이지 실패 — 본문 전체를 RetryNotice로 대체한다 (AC 8). 이어받기 실패는 제외 */
  isError: boolean;
  retry: () => void;
  /** 다음 페이지 존재 여부 — true면 "더 보기" 노출 (AC 10) */
  hasNext: boolean;
  /** 다음 페이지 이어받기 — 진행 중이거나 더 없으면 아무것도 하지 않는다 */
  loadMore: () => void;
  isLoadingMore: boolean;
}

/**
 * 위치별 영상 피드 조회 (MSG-518 AC 5·7·8·10) —
 * `GET /api/event-occurrences/{occurrenceId}/locations/{locationId}/videos`.
 * 커서 페이지(`videos`·`hasNext`·`nextCursor`)를 useInfiniteQuery로 이어받는다
 * (use-explore-regions-query 선례). 인증 게이트 없음 — 서버가 익명 조회를 허용한다
 * (AC 8). 영상 없음은 실패가 아니라 빈 페이지다 (AC 7). 지도 SDK를 import하지
 * 않는다(RN 경계).
 */
export const useLocationVideosQuery = (
  target: LocationVideosTarget | null,
): LocationVideosResult => {
  const active = target !== null;
  // 미요청 상태에서도 생성 옵션 타입이 path를 요구해 0으로 채운다 (viewportQueryArgs 관례)
  const path = target ?? { occurrenceId: 0, locationId: 0 };

  const query = useInfiniteQuery({
    ...getLocationVideosInfiniteOptions({ path }),
    // 첫 페이지는 **커서 없이** 요청한다 — pageParam이 문자열이면 `cursor` 쿼리로
    // 실리는데, 빈 문자열이면 `cursor=`가 그대로 나가 서버가 400으로 거부한다
    // (explore-regions 선례 — use-occupied-grids-query 브라우저 실측). 이 명세는
    // path가 필수라 빈 객체 대신 같은 path를 실어 커서 없는 객체 파라미터를 만든다
    initialPageParam: { path },
    getNextPageParam: nextLocationVideosPageParam,
    enabled: active,
  });

  const loadMore = useLoadMore(query);

  const videos =
    query.data === undefined
      ? undefined
      : flattenLocationVideoPages(query.data.pages);

  return {
    videos,
    // 첫 페이지 0건 ⇔ 평탄화 0건 — 이후 페이지는 첫 페이지가 있어야만 이어받는다
    hasLocationVideos: (videos?.length ?? 0) > 0,
    // 비활성(게이트 false) 쿼리는 영원히 pending이라 게이트로 눌러준다 (gated-query-status 관례)
    isPending: active && query.isPending,
    // 이어받기 실패를 전면 실패로 승격하지 않는다 (codex 리뷰 P2 — explore-regions AC 6
    // 동일 방식): fetchNextPage 실패도 isError를 세우므로 필터 없이는 이미 로드된
    // 목록이 RetryNotice로 교체된다. 받은 목록 유지 + hasNext 잔존 → "더 보기"
    // 재클릭이 곧 재시도 (DECISIONS 2026-08-31 — 별도 실패 UI 미노출 결정과 정합)
    isError: query.isError && !query.isFetchNextPageError,
    retry: () => void query.refetch(),
    hasNext: query.hasNextPage,
    loadMore,
    isLoadingMore: query.isFetchingNextPage,
  };
};
