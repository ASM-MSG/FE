import { useQuery } from "@tanstack/react-query";
import { getVideoDetailOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { EventVideoDetailResponseDto } from "@/shared/api/generated/types.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";

export interface EventVideoDetailResult {
  detail: EventVideoDetailResponseDto | null;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * 행사 영상 상세 조회 (MSG-520 AC 1) — `GET /api/event-videos/{videoId}`.
 * presigned playbackUrl + 메타 + helpful + 댓글 첫 페이지를 한 번에 받는다.
 *
 * **조회수 부작용 주의(스펙 리스크)**: 이 조회는 서버가 타인 조회수를 올린다 —
 * 자동 재조회 트리거(포커스·재연결)를 끄고, 뮤테이션 반영은 invalidate가 아니라
 * setQueryData seed로만 한다 (use-event-video-mutations). 응답에 expiresInSec이
 * 없어 presigned TTL 유도 staleTime(use-video-playback-query 관례)은 불가 —
 * 전역 기본 staleTime(30초)을 따르고, staleTime 경과 후 재마운트(패널 재오픈)의
 * 재조회는 새 시청 1회로 의미가 맞다.
 * 지도 SDK를 import하지 않는다(RN 경계).
 */
export const useEventVideoDetailQuery = (
  videoId: number,
): EventVideoDetailResult => {
  const query = useQuery({
    ...getVideoDetailOptions({ path: { videoId } }),
    select: unwrapEnvelope,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    detail: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
};
