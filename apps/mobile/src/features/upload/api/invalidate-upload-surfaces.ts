import type { QueryClient } from "@tanstack/react-query";
import {
  getPlaybackQueryKey,
  getRegionVideosQueryKey,
} from "../../../shared/api/query-options";
import type { EventConfirmTarget } from "../model/confirm-input";
import { invalidateEventSurfaces } from "./invalidate-event-surfaces";
import { invalidateGridQueries } from "./invalidate-grid-queries";

/** 업로드가 바꾼 화면을 무효화하는 데 필요한 확정 정보 — 확정 시점과 READY 시점이 같은 값을 관통시킨다 */
export interface UploadSurfaceTarget {
  videoId: number;
  /** 모바일 확정 응답은 gridId를 항상 준다 — 웹(`string | null`)과 달리 non-null */
  gridId: string;
  /** 행사 귀속 확정에만 — 그 회차·위치를 정확 키로 무효화한다 (MSG-560 D12) */
  event: EventConfirmTarget | null;
}

/**
 * 업로드가 바꾼 화면 전부를 무효화한다 (MSG-567 — 웹 `invalidate-upload-surfaces.ts` 이식).
 *
 * **확정 시점과 READY 시점이 같은 집합을 써야 한다** — READY 재무효화의 목적이
 * "확정 시점 재조회가 서버 non-READY라 헛발이었으니 데이터가 실제로 생긴 뒤 다시 한다"이기
 * 때문이다. 두 곳이 갈라져 있으면 한쪽에만 있는 화면(예: 도감 갤러리 `getRegionVideos`)은
 * READY가 돼도 영영 갱신되지 않는다 — 웹 QA 실측으로 드러난 실제 구멍이다.
 * 그래서 확정(`settleUploadSuccess`)·READY 전이(`start-ready-refresh`)가 모두 이걸 부른다.
 *
 * 웹 대비 편차: 잔디 이력(`getUploadHistory`)은 모바일 `invalidateGridQueries`가 이미
 * 포함하므로 따로 부르지 않고, 행사 키는 기존 `invalidateEventSurfaces`를 재사용한다.
 */
export const invalidateUploadSurfaces = (
  queryClient: QueryClient,
  { videoId, gridId, event }: UploadSurfaceTarget,
): void => {
  // ① 단건 재생 — 썸네일·playbackUrl·처리 상태
  void queryClient.invalidateQueries({
    queryKey: getPlaybackQueryKey({ path: { videoId } }),
  });

  // ② 격자 영상 목록·격자 상세·점령 집계 + 잔디 이력
  invalidateGridQueries(queryClient, gridId);

  // ③ 도감 동 영상 목록 — regionCode별로 캐시 키가 갈라져 식별자(_id)만 남긴
  // 부분 키로 전 파라미터 무효화 (invalidate-video-queries 관례)
  const [regionKey] = getRegionVideosQueryKey({ query: { regionCode: "" } });
  void queryClient.invalidateQueries({ queryKey: [{ _id: regionKey._id }] });

  // ④ 행사 귀속 확정에만 — 해당 위치 영상 목록(infinite)과 위치 목록(videoCount) 정확 키
  if (event !== null) invalidateEventSurfaces(queryClient, event);
};
