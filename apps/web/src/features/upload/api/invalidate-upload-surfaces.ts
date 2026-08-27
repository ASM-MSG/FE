import type { QueryClient } from "@tanstack/react-query";
import {
  getPlaybackQueryKey,
  getRegionVideosQueryKey,
  getUploadHistoryQueryKey,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { invalidateGridQueries } from "./invalidate-grid-queries";

/**
 * 업로드·교체가 바꾼 화면 전부를 무효화한다 (MSG-476 재작업 2회차).
 *
 * **확정 시점과 READY 시점이 같은 집합을 써야 한다** — READY 재무효화의 목적이
 * "확정 시점 재조회가 서버 non-READY라 헛발이었으니 데이터가 실제로 생긴 뒤 다시 한다"이기
 * 때문이다. 두 곳이 갈라져 있으면 한쪽에만 있는 화면(예: 도감 갤러리 `getRegionVideos`)은
 * READY가 돼도 영영 갱신되지 않는다 — QA 실측으로 드러난 실제 구멍이다.
 *
 * 그래서 호출 지점을 이 함수 하나로 모은다: 확정(useConfirmUpload)·교체(useReplaceVideo)·
 * READY 전이(start-ready-refresh)가 모두 이걸 부른다.
 */
export const invalidateUploadSurfaces = (
  queryClient: QueryClient,
  { videoId, gridId }: { videoId: number; gridId: string | null },
): void => {
  // ① 단건 재생 — 썸네일·playbackUrl·처리 상태
  void queryClient.invalidateQueries({
    queryKey: getPlaybackQueryKey({ path: { videoId } }),
  });

  // ② 격자 영상 목록·격자 상세·점령 집계 (gridId 미상이면 광역)
  invalidateGridQueries(queryClient, gridId);

  // ③ 도감 동 영상 목록 — regionCode별로 캐시 키가 갈라져 식별자(_id)만 남긴
  // 부분 키로 전 파라미터 무효화 (MSG-411 use-video-mutations 관례)
  const [regionKey] = getRegionVideosQueryKey({ query: { regionCode: "" } });
  void queryClient.invalidateQueries({ queryKey: [{ _id: regionKey._id }] });

  // ④ 업로드 잔디 이력 (MSG-414 AC 11, A8)
  void queryClient.invalidateQueries({ queryKey: getUploadHistoryQueryKey() });
};
