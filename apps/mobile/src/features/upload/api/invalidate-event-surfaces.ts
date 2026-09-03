import type { QueryClient } from "@tanstack/react-query";
import {
  getLocationVideosInfiniteQueryKey,
  getLocationsQueryKey,
} from "../../../shared/api/query-options";
import type { EventConfirmTarget } from "../model/confirm-input";

/**
 * 행사 표면 무효화 (MSG-560 D12 · codex 리뷰 P1) — 웹 `invalidate-upload-surfaces.ts`의
 * 행사 분기 대응. 두 시점에서 부른다:
 * - 확정 직후(대상 있음): 그 회차·그 위치만 정확 무효화.
 * - 블러 READY(대상 없음 — 워처는 videoId만 안다): `_id` 부분 키로 전 위치 무효화.
 *   서버가 처리 미완 영상을 위치 목록에서 제외하므로 확정 시점 재조회는 비어 있고, READY에서
 *   한 번 더 있어야 위치 상세·videoCount가 신선해진다(격자 쿼리 `onReady`와 같은 이유).
 */
export const invalidateEventSurfaces = (
  queryClient: QueryClient,
  event: EventConfirmTarget | null,
): void => {
  const [videosKey] = getLocationVideosInfiniteQueryKey({
    path: event ?? { occurrenceId: 0, locationId: 0 },
  });
  const [locationsKey] = getLocationsQueryKey({
    path: { occurrenceId: event?.occurrenceId ?? 0 },
  });
  void queryClient.invalidateQueries({
    queryKey: event === null ? [{ _id: videosKey._id }] : [videosKey],
  });
  void queryClient.invalidateQueries({
    queryKey: event === null ? [{ _id: locationsKey._id }] : [locationsKey],
  });
};
