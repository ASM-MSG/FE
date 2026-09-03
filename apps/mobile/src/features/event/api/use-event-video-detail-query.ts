import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getVideoDetailOptions } from "../../../shared/api/query-options";
import type { EventVideoDetailResponseDto } from "../../../shared/api/sdk";

/**
 * 행사 영상 상세 조회 옵션 (MSG-562 D2) — 웹 `use-event-video-detail-query.ts` 이식.
 * `GET /api/event-videos/{videoId}` — presigned playbackUrl + 메타 + helpful + 댓글 첫 페이지.
 *
 * **조회수 부작용 주의**: 이 조회는 서버가 타인 조회수를 올린다 — 자동 재조회 트리거
 * (포커스·재연결)를 끄고, 뮤테이션 반영은 invalidate가 아니라 setQueryData seed로만 한다
 * (`event-video-mutations`). 응답에 expiresInSec이 없어 TTL 유도 staleTime은 불가 —
 * 전역 기본(30초)을 따르고, 경과 후 재진입의 재조회는 새 시청 1회로 의미가 맞다.
 * 순수 팩토리로 분리한 이유는 옵션 플래그를 테스트가 직접 단정하기 위함(AC 10).
 */
export const eventVideoDetailQueryOptions = (videoId: number) => ({
  ...getVideoDetailOptions({ path: { videoId } }),
  select: unwrapEnvelope<EventVideoDetailResponseDto>,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

export interface EventVideoDetailResult {
  detail: EventVideoDetailResponseDto | null;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

export const useEventVideoDetailQuery = (
  videoId: number,
): EventVideoDetailResult => {
  const query = useQuery(eventVideoDetailQueryOptions(videoId));

  return {
    detail: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
};
