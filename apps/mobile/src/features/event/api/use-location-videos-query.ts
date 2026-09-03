import { useInfiniteQuery } from "@tanstack/react-query";
import { getLocationVideosInfiniteOptions } from "../../../shared/api/query-options";
import {
  locationVideosResult,
  nextLocationVideosPageParam,
  type LocationVideosResult,
} from "../model/location-videos-query";

/** 조회 대상 — 행사방 + 선택 위치. null이면 미발사 */
export interface LocationVideosTarget {
  occurrenceId: number;
  locationId: number;
}

export interface LocationVideosQueryResult extends LocationVideosResult {
  /** 첫 페이지 실패 재시도 */
  retry: () => void;
  /** 다음 페이지 이어받기 — 진행 중이거나 더 없으면 아무것도 하지 않는다 */
  loadMore: () => void;
}

/**
 * 위치별 영상 피드 조회 (MSG-560 D13) —
 * `GET /api/event-occurrences/{occurrenceId}/locations/{locationId}/videos`.
 * 커서 페이지를 useInfiniteQuery로 이어받는다. 인증 게이트 없음(서버가 익명 조회 허용).
 * 판정·파생은 전부 `model/location-videos-query`(순수)에 있고 여기는 배선만 한다.
 */
export const useLocationVideosQuery = (
  target: LocationVideosTarget | null,
): LocationVideosQueryResult => {
  const active = target !== null;
  // 미요청 상태에서도 생성 옵션 타입이 path를 요구해 0으로 채운다 (viewportQueryArgs 관례)
  const path = target ?? { occurrenceId: 0, locationId: 0 };

  const query = useInfiniteQuery({
    ...getLocationVideosInfiniteOptions({ path }),
    // 첫 페이지는 **커서 없이** 요청한다 — pageParam이 빈 문자열이면 `cursor=`가 그대로
    // 나가 서버가 400으로 거부한다(웹 explore-regions 선례). path 객체를 실어 커서 없는
    // 객체 파라미터를 만든다
    initialPageParam: { path },
    getNextPageParam: nextLocationVideosPageParam,
    enabled: active,
  });

  return {
    ...locationVideosResult(query, active),
    retry: () => void query.refetch(),
    loadMore: () => {
      if (!query.hasNextPage || query.isFetchingNextPage) return;
      void query.fetchNextPage();
    },
  };
};
