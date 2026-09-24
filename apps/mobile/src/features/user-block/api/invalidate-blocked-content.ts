import type { QueryClient } from "@tanstack/react-query";
import {
  getCommentsQueryKey,
  getGridGlobalVideosQueryKey,
  getLocationVideosQueryKey,
  getMissionVideosQueryKey,
  getPlaybackQueryKey,
  getVideoDetailQueryKey,
} from "../../../shared/api/query-options";

/**
 * 차단·해제 성공 후 무효화 집합 (MSG-570 기준 6) — 순수 배선 함수
 * (`video-actions/api/invalidate-video-queries` 관례: 모바일은 훅 렌더 테스트가 없어 분리).
 *
 * 서버가 차단 관계로 필터하는 목록(MSG-569 6종) 중 앱이 캐시하는 것을 모두 `_id` 부분 키로
 * 무효화한다 — 생성 `createQueryKey`가 무한 쿼리에는 `_infinite`를 **추가**만 하므로
 * `getLocationVideos` infinite도 같은 부분 키에 매칭된다.
 *
 * 단건 조회 2종은 `refetchType: "none"` — 다음 마운트에서만 재조회한다:
 * - `getPlayback`·`getVideoDetail`은 재조회가 조회수를 올린다(MSG-431·MSG-562).
 * - 재생 화면에서 차단 직후 활성 재조회하면 pop 전에 404 안내가 플래시한다.
 * 차단 목록(`getBlockedUsers`)은 여기 없다 — 해제는 seed(`removeBlockedUser`)로 반영한다.
 */
const invalidateAllOf = (
  queryClient: QueryClient,
  [key]: [{ _id: string }],
  refetchType?: "none",
): void => {
  void queryClient.invalidateQueries({
    queryKey: [{ _id: key._id }],
    refetchType,
  });
};

export const invalidateAfterBlockChange = (queryClient: QueryClient): void => {
  invalidateAllOf(
    queryClient,
    getGridGlobalVideosQueryKey({ path: { gridId: "" } }),
  );
  invalidateAllOf(
    queryClient,
    getLocationVideosQueryKey({ path: { occurrenceId: 0, locationId: 0 } }),
  );
  invalidateAllOf(
    queryClient,
    getMissionVideosQueryKey({ path: { missionId: 0 } }),
  );
  invalidateAllOf(queryClient, getCommentsQueryKey({ path: { videoId: 0 } }));
  invalidateAllOf(
    queryClient,
    getPlaybackQueryKey({ path: { videoId: 0 } }),
    "none",
  );
  invalidateAllOf(
    queryClient,
    getVideoDetailQueryKey({ path: { videoId: 0 } }),
    "none",
  );
};
