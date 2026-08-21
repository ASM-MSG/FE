import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getPlaybackOptions } from "../../../shared/api/query-options";
import type { VideoPlaybackResponseDto } from "../../../shared/api/sdk";
import { playbackStaleTime } from "../model/video-playback";

/**
 * 단건 영상 재생 조회 훅 (MSG-446 기준 1·6) — `GET /api/videos/{videoId}`.
 * 웹 `features/map-home/model/use-video-playback-query.ts` 대응이되,
 * **목(`videoSrc`) 분기는 옮기지 않았다** — 모바일에는 목 피드가 없다 (MSG-427 F1 선례).
 *
 * staleTime을 응답 `expiresInSec`에서 유도한다 — presigned URL TTL 이내 재오픈은 캐시를
 * 쓰고(뒤로 갔다 같은 영상을 다시 열어도 재조회·조회수 재증가가 없다), 경과 후엔 재조회해
 * 만료 URL이 캐시에서 재생되지 않는다. staleTime 함수는 select 이전의 캐시 원본(봉투)을
 * 받으므로 봉투 계층에서 꺼낸다.
 *
 * **이 엔드포인트는 조회수를 올린다**(명세: "이번 조회 증가 전 스냅샷"). 재생 화면에서는
 * 의도된 부작용이라 MSG-431의 시트 게이트(`enabled: open`)와 달리 열자마자 부른다.
 */
export interface VideoPlaybackResult {
  playback: VideoPlaybackResponseDto | null;
  isPending: boolean;
  isError: boolean;
  /** 실패 원인 — 문구·재시도 노출 판정은 `playbackAccessNotice`가 한다 (기준 5) */
  error: unknown;
  retry: () => void;
}

export const useVideoPlaybackQuery = (videoId: number): VideoPlaybackResult => {
  const query = useQuery({
    ...getPlaybackOptions({ path: { videoId } }),
    select: unwrapEnvelope,
    staleTime: (q) =>
      playbackStaleTime(q.state.data?.data.expiresInSec ?? null),
  });

  return {
    playback: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    retry: () => void query.refetch(),
  };
};
