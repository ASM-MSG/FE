import { useQueries } from "@tanstack/react-query";
import type { ApiResponseDtoGridVideoPageResponseDto } from "@/shared/api/generated";
import { getGridGlobalVideosOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { toFeedItemFromGlobal, type GridFeedItem } from "./grid-videos";
import { entityQueryPolicy } from "./map-query-policy";

/**
 * 여러 격자의 전역 영상을 한 피드로 합치는 훅 (MSG-395 AC 9·17).
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 동 요약(핫구역)과 미션 상세가 같은 문제를 갖는다 — 화면 단위(동·미션)의 영상 목록
 * API가 없고 격자 단위만 있다. 호출부가 **격자 수를 미리 상한**(HOT_SAMPLE_GRID_LIMIT)
 * 으로 묶어 넘기고, 여기서는 받은 만큼만 조회·병합한다.
 * 내 영상 목록(`/my-videos`)은 합치지 않는다 — 격자마다 한 번씩 더 나가 요청이 두 배가
 * 되고, 표본 피드에는 소유 구분이 필요 없다(mine=false 고정).
 *
 * 병합 결과를 useMemo로 잡지 않는다: 쿼리 수가 입력에 따라 변해 의존성 배열 길이가
 * 고정되지 않는다(훅 규칙 위반). 표본이 상한으로 묶여 있어(≤5격자 × 20건) 매 렌더
 * 재계산이 싸고, 소비처는 목록 렌더뿐이라 참조 안정이 필요 없다.
 */
export interface MultiGridVideosResult {
  /** 격자 경계를 지운 최신순 피드 — videoId 중복 제거 */
  items: GridFeedItem[];
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

export const useMultiGridVideosQuery = (
  gridIds: string[],
): MultiGridVideosResult => {
  const queries = useQueries({
    queries: gridIds.map((gridId) => ({
      ...getGridGlobalVideosOptions({ path: { gridId } }),
      // useQueries는 useQuery와 달리 select 반환 타입을 배열 요소로 전파하지 못한다 —
      // 인자 타입을 명시해 언랩 결과가 data 타입이 되게 한다
      select: (envelope: ApiResponseDtoGridVideoPageResponseDto) =>
        unwrapEnvelope(envelope),
      ...entityQueryPolicy,
    })),
  });

  const byVideoId = new Map<number, GridFeedItem>();
  for (const query of queries) {
    for (const dto of query.data?.videos ?? []) {
      // 같은 영상이 인접 격자 응답에 함께 실려도 피드에는 한 번만 (첫 등장 유지)
      if (!byVideoId.has(dto.videoId))
        byVideoId.set(dto.videoId, toFeedItemFromGlobal(dto));
    }
  }

  return {
    items: [...byVideoId.values()].toSorted(
      (a, b) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    ),
    isPending: queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
    retry: () => {
      for (const query of queries) void query.refetch();
    },
  };
};
