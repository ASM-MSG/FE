import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import {
  getLocationsOptions,
  getOccurrenceDetailOptions,
} from "../../../shared/api/query-options";
import type {
  EventLocationResponseDto,
  EventOccurrenceDetailResponseDto,
} from "../../../shared/api/sdk";
import { entityQueryPolicy } from "../../map-home/model/map-query-policy";

const EMPTY_LOCATIONS: EventLocationResponseDto[] = [];

export interface EventRoomQueryResult {
  detail: EventOccurrenceDetailResponseDto | null;
  /** 서버 정렬(표시 순서 → 위치 id) 유지 — 미도착·실패는 빈 목록 */
  locations: EventLocationResponseDto[];
  isPending: boolean;
  isError: boolean;
  /** 실패한 쿼리만 다시 조회한다 */
  retry: () => void;
}

/**
 * 행사방 상세 + 위치 목록 조회 (MSG-557 D11) — 웹 `use-event-detail-query.ts`·
 * `use-event-locations-query.ts` 합본. 행사방이 열려 있을 때만(occurrenceId 존재) 발사,
 * 익명 허용(서버 명세). queryKey는 생성 옵션 그대로라 2단계(위치 상세)와 캐시를 공유한다.
 */
export const useEventRoomQuery = (
  occurrenceId: number | null,
): EventRoomQueryResult => {
  const enabled = occurrenceId !== null;
  // 미요청 상태에서도 생성 옵션 타입이 값을 요구해 0으로 채운다 (viewportQueryArgs 관례)
  const path = { occurrenceId: occurrenceId ?? 0 };

  const detail = useQuery({
    ...getOccurrenceDetailOptions({ path }),
    select: unwrapEnvelope,
    enabled,
    ...entityQueryPolicy,
  });
  const locations = useQuery({
    ...getLocationsOptions({ path }),
    select: unwrapEnvelope,
    enabled,
    ...entityQueryPolicy,
  });

  return {
    detail: detail.data ?? null,
    locations: locations.data ?? EMPTY_LOCATIONS,
    isPending: detail.isPending || locations.isPending,
    isError: detail.isError || locations.isError,
    retry: () => {
      if (detail.isError) void detail.refetch();
      if (locations.isError) void locations.refetch();
    },
  };
};
