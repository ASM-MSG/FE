import { keepPreviousData } from "@tanstack/react-query";

/**
 * 지도 계열 쿼리 공통 정책 — 웹 `features/map-home/model/map-query-policy.ts`의 복제본
 * (MSG-423). 모바일 전역 기본 staleTime은 30초(query-provider)라 이동·줌이 잦은
 * 지도 계열에는 갱신이 늦다. 동등성은 map-query-policy.parity.test.ts가 단정한다.
 */

/** 지도 쿼리 staleTime(ms) — 5초 미만이면 드래그 한 번에 중복 호출이 늘고, 30초면 갱신이 늦다 */
export const MAP_QUERY_STALE_TIME = 5_000;

/**
 * 뷰포트가 바뀌면 queryKey가 바뀌므로 기본값이면 매 이동마다 빈 데이터로 돌아간다 —
 * `keepPreviousData`로 새 응답이 올 때까지 직전 값을 유지해 깜빡임을 없앤다.
 */
export const mapQueryPolicy = {
  staleTime: MAP_QUERY_STALE_TIME,
  placeholderData: keepPreviousData,
} as const;

/**
 * **단일 엔티티 조회용** 정책 — `placeholderData`가 없다.
 * 행정동이 바뀌면 카드 목록이 통째로 다른 지역의 것이 되므로, 새 응답 전까지 이전 동의
 * 카드가 남아 있으면 안 된다.
 */
export const entityQueryPolicy = {
  staleTime: MAP_QUERY_STALE_TIME,
} as const;
