import { useQuery } from "@tanstack/react-query";
import { getPlaybackOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { VideoPlaybackResponseDto } from "@/shared/api/generated";
import { unwrapEnvelope } from "@/shared/api/envelope";
import type { FeedVideo } from "./grid-videos";
import { playbackStaleTime } from "./video-playback";

/**
 * 단건 영상 재생 조회 훅 (MSG-326 기준 5·6) — `GET /api/videos/{videoId}`.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * staleTime을 응답 `expiresInSec`에서 유도한다(기준 5) — presigned URL TTL 이내 재오픈은
 * 캐시를 쓰고, 경과 후엔 재조회해 만료 URL이 캐시에서 재생되지 않는다. staleTime 함수는
 * select 이전의 캐시 원본(봉투)을 받으므로 봉투 계층에서 꺼낸다.
 */

/** 재생 조회 결과 — 로딩·실패를 구분해 미니 패널이 상태 3종을 그린다 (기준 12) */
export interface VideoPlaybackResult {
  playback: VideoPlaybackResponseDto | null;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

export const useVideoPlaybackQuery = (
  video: FeedVideo,
): VideoPlaybackResult => {
  // 테마 피드 과도기 분기 (기준 6, 추정 8): videoSrc 보유(목) 선택은 쿼리를 생략한다 —
  // 목 videoId로 getPlayback을 부르면 404 실패 상태로 오히려 회귀한다.
  // 테마 피드 실전환 티켓에서 이 분기가 함께 제거된다.
  const enabled = video.videoSrc === undefined;

  const query = useQuery({
    ...getPlaybackOptions({ path: { videoId: video.videoId } }),
    select: unwrapEnvelope,
    enabled,
    staleTime: (q) =>
      playbackStaleTime(q.state.data?.data.expiresInSec ?? null),
  });

  return {
    playback: query.data ?? null,
    // 비활성(목 경로) 쿼리는 영원히 pending이라 enabled로 게이트한다
    isPending: enabled && query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
};
