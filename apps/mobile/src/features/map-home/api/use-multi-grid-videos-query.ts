import { useQueries } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getGridGlobalVideosOptions } from "../../../shared/api/query-options";
import type { ApiResponseDtoGridVideoPageResponseDto } from "../../../shared/api/sdk";
import { useAuth } from "../../auth/model/auth-session";
import { toFeedItemFromGlobal, type GridFeedItem } from "../model/grid-videos";
import type { GatedQueryStatus } from "../model/home-sheet-state";
import { entityQueryPolicy } from "../model/map-query-policy";

/**
 * 여러 격자의 전역 영상을 한 피드로 합치는 훅 (MSG-427 B7) — 웹
 * `use-multi-grid-videos-query.ts` 이식. 지도 SDK를 import하지 않는다.
 *
 * 동 요약에는 화면 단위(동) 영상 목록 API가 없고 격자 단위만 있다 — 호출부가 격자 수를
 * 미리 상한(`HOT_SAMPLE_GRID_LIMIT`)으로 묶어 넘기고 여기서는 받은 만큼만 조회·병합한다.
 * 내 영상 목록은 합치지 않는다 — 격자마다 한 번씩 더 나가 요청이 두 배가 되고, 표본
 * 피드에는 소유 구분이 필요 없다(mine=false 고정).
 *
 * 병합 결과를 useMemo로 잡지 않는다: 쿼리 수가 입력에 따라 변해 의존성 배열 길이가
 * 고정되지 않는다(훅 규칙 위반). 표본이 상한으로 묶여 있어(≤5격자 × 20건) 재계산이 싸다.
 */
export interface MultiGridVideosResult extends GatedQueryStatus {
  /** 격자 경계를 지운 최신순 피드 — videoId 중복 제거 */
  items: GridFeedItem[];
}

export const useMultiGridVideosQuery = (
  gridIds: string[],
): MultiGridVideosResult => {
  const { isAuthenticated, hydrated } = useAuth();
  const active = isAuthenticated && gridIds.length > 0;

  const queries = useQueries({
    queries: gridIds.map((gridId) => ({
      ...getGridGlobalVideosOptions({ path: { gridId } }),
      // useQueries는 useQuery와 달리 select 반환 타입을 배열 요소로 전파하지 못한다 —
      // 인자 타입을 명시해 언랩 결과가 data 타입이 되게 한다
      select: (envelope: ApiResponseDtoGridVideoPageResponseDto) =>
        unwrapEnvelope(envelope),
      enabled: active,
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
    // Hermes(RN 0.86)에 toSorted 미구현 — 이미 복사한 배열이라 sort로 정렬한다
    items: [...byVideoId.values()].sort(
      (a, b) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    ),
    isError: queries.some((query) => query.isError),
    isResolved:
      (!active && hydrated) ||
      (queries.length > 0 &&
        queries.every((query) => query.data !== undefined)),
    retry: () => {
      if (!active) return;
      for (const query of queries) void query.refetch();
    },
  };
};
