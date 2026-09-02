import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getApprovedEventsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type {
  GetApprovedEventsData,
  OrgEventCityCountResponseDto,
  OrgEventItemResponseDto,
} from "@/shared/api/generated/types.gen";

/**
 * 승인 이벤트 후보 조회 (MSG-546 AC 3·4) — `GET /api/org/events`.
 * 소속 이벤트 선택 모달의 재료(시·도 칩·건수·목록)를 한 번에 받는다.
 * 서버 계약: `totalCount`·`cityCounts`는 필터·검색과 무관한 고정값이고 `events`에만
 * `city`·`name`이 적용된다 — 그래서 검색·필터 재조회 중에도 칩과 건수 라벨이 흔들리지 않게
 * `keepPreviousData`로 이전 응답을 유지한다.
 * 모달이 열려 있는 동안만 발사한다(enabled).
 */

const EMPTY_EVENTS: OrgEventItemResponseDto[] = [];
const EMPTY_CITY_COUNTS: OrgEventCityCountResponseDto[] = [];

type ApprovedEventsQuery = NonNullable<GetApprovedEventsData["query"]>;

/**
 * 모달 선택 상태를 서버 쿼리 파라미터로 파생한다 (AC 3·4).
 * "전체 보기"(시 미선택)와 빈 검색어는 키를 싣지 않는다 — 서버 기본(전체)과 같다.
 */
export const toApprovedEventsQuery = ({
  city,
  name,
}: {
  city: string | null;
  name: string;
}): ApprovedEventsQuery => {
  const trimmed = name.trim();
  return {
    ...(city !== null && { city }),
    ...(trimmed !== "" && { name: trimmed }),
  };
};

export const useApprovedEventsQuery = ({
  city,
  name,
  enabled,
}: {
  city: string | null;
  name: string;
  enabled: boolean;
}): {
  totalCount: number;
  cityCounts: OrgEventCityCountResponseDto[];
  events: OrgEventItemResponseDto[];
  isPending: boolean;
  isError: boolean;
  retry: () => void;
} => {
  const query = useQuery({
    ...getApprovedEventsOptions({
      query: toApprovedEventsQuery({ city, name }),
    }),
    select: unwrapEnvelope,
    enabled,
    placeholderData: keepPreviousData,
  });

  return {
    totalCount: query.data?.totalCount ?? 0,
    cityCounts: query.data?.cityCounts ?? EMPTY_CITY_COUNTS,
    events: query.data?.events ?? EMPTY_EVENTS,
    isPending: query.isPending,
    isError: query.isError,
    retry: query.refetch,
  };
};
