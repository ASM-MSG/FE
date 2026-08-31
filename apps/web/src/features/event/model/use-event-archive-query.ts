import { useQuery } from "@tanstack/react-query";
import { entityQueryPolicy } from "@/features/map-home/model/map-query-policy";
import { unwrapEnvelope } from "@/shared/api/envelope";
import {
  getLocationsOptions,
  getOccurrenceDetailOptions,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import type {
  EventLocationResponseDto,
  EventOccurrenceDetailResponseDto,
} from "@/shared/api/generated/types.gen";

/*
 * MSG-519 아카이브 네임스페이스 쿼리 (질문 4 승인) — MSG-517이 만들 상세/위치 훅과 기능이
 * 겹치지만 파일명을 달리해 병렬 충돌을 피한다. queryKey는 생성 옵션(endpoint 기준)을 그대로
 * 써서 517 훅과 수렴 시 캐시가 dedupe된다. 웨이브 2 완주 후 통합 정리(1커밋 거리).
 * 익명 발사 (추정 8 — 칩 목록 익명 200 실측 선례). 플랫폼 중립 — RN 경계 유지.
 */

/**
 * 회차 상세 조회 — `GET /api/event-occurrences/{id}`.
 * EventRoomPanel의 모드 입력(상세 status 4값 정본 — 질문 3)과 아카이브 본문이 공유한다.
 */
export const useEventArchiveDetailQuery = (occurrenceId: number) =>
  useQuery({
    ...getOccurrenceDetailOptions({ path: { occurrenceId } }),
    select: unwrapEnvelope,
    ...entityQueryPolicy,
  });

export interface EventArchiveResult {
  detail: EventOccurrenceDetailResponseDto | undefined;
  /** 행사 위치 — 서버 정렬 그대로 (AC 5) */
  locations: EventLocationResponseDto[] | undefined;
  isPending: boolean;
  isError: boolean;
  /** 실패한 조회만 다시 쏜다 (AC 9) */
  retry: () => void;
}

/**
 * 종료 행사 아카이브 재료 조회 (MSG-519 AC 3·5·9) — 상세 + 위치 목록.
 * 상세는 useEventArchiveDetailQuery와 같은 키라 패널-본문 이중 구독이 요청 1회로 합쳐진다.
 */
export const useEventArchiveQuery = (
  occurrenceId: number,
): EventArchiveResult => {
  const detail = useEventArchiveDetailQuery(occurrenceId);
  const locations = useQuery({
    ...getLocationsOptions({ path: { occurrenceId } }),
    select: unwrapEnvelope,
    ...entityQueryPolicy,
  });

  return {
    detail: detail.data,
    locations: locations.data,
    isPending: detail.isPending || locations.isPending,
    isError: detail.isError || locations.isError,
    retry: () => {
      if (detail.isError) void detail.refetch();
      if (locations.isError) void locations.refetch();
    },
  };
};
