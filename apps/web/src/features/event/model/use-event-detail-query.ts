import { useQuery } from "@tanstack/react-query";
import { entityQueryPolicy } from "@/features/map-home/model/map-query-policy";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getOccurrenceDetailOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { EventOccurrenceDetailResponseDto } from "@/shared/api/generated/types.gen";

/**
 * 행사 회차 상세 조회 (MSG-517 AC 1·10) — `GET /api/event-occurrences/{occurrenceId}`.
 * 행사방이 열려 있을 때만(occurrenceId 존재) 발사한다. 인증 게이트 없음 — 서버 명세가
 * 익명 열람을 서술(비로그인은 notificationOn=false). 404(13404)·실패는 isError로 수렴해
 * RetryNotice 재료가 된다 (AC 10).
 */
export const useEventDetailQuery = (
  occurrenceId: number | null,
): {
  detail: EventOccurrenceDetailResponseDto | null;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
} => {
  const query = useQuery({
    // 미요청 상태에서도 생성 옵션 타입이 값을 요구해 0으로 채운다 (viewportQueryArgs 관례)
    ...getOccurrenceDetailOptions({
      path: { occurrenceId: occurrenceId ?? 0 },
    }),
    select: unwrapEnvelope,
    enabled: occurrenceId !== null,
    ...entityQueryPolicy,
  });

  return {
    detail: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    retry: query.refetch,
  };
};
