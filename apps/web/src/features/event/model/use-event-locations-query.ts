import { useQuery } from "@tanstack/react-query";
import { entityQueryPolicy } from "@/features/map-home/model/map-query-policy";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getLocationsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { EventLocationResponseDto } from "@/shared/api/generated/types.gen";

const EMPTY_LOCATIONS: EventLocationResponseDto[] = [];

/**
 * 행사 위치 목록 조회 (MSG-517 AC 1·6·10) —
 * `GET /api/event-occurrences/{occurrenceId}/locations`.
 * 행사방이 열려 있을 때만 발사한다(익명 허용 — 서버 명세). 서버 정렬(표시 순서 → 위치 id)을
 * 그대로 유지하고, 실패·미발사는 빈 목록 + isError로 수렴한다 (AC 10 — RetryNotice 재료).
 * 개요 패널·지도 오버레이(use-event-overlay-publish)·클릭 라우팅(MapShell)이 같은
 * queryKey를 공유해 조회는 1회다.
 */
export const useEventLocationsQuery = (
  occurrenceId: number | null,
): {
  locations: EventLocationResponseDto[];
  isPending: boolean;
  isError: boolean;
  retry: () => void;
} => {
  const query = useQuery({
    // 미요청 상태에서도 생성 옵션 타입이 값을 요구해 0으로 채운다 (viewportQueryArgs 관례)
    ...getLocationsOptions({ path: { occurrenceId: occurrenceId ?? 0 } }),
    select: unwrapEnvelope,
    enabled: occurrenceId !== null,
    ...entityQueryPolicy,
  });

  return {
    locations: query.data ?? EMPTY_LOCATIONS,
    isPending: query.isPending,
    isError: query.isError,
    retry: query.refetch,
  };
};
