import { keepPreviousData } from "@tanstack/react-query";

/**
 * 지도 계열 쿼리 공통 정책 (MSG-325 기준 9).
 * 지도 이동·줌이 잦아 전역 기본값(30초 — MSG-323 기준 8)으로는 갱신이 늦다.
 */

/**
 * 지도 쿼리 staleTime(ms). 5초 미만이면 드래그 한 번에 중복 호출이 늘고,
 * 30초(전역 기본)면 이동 후 갱신이 눈에 띄게 늦다.
 */
export const MAP_QUERY_STALE_TIME = 5_000;

/**
 * 뷰포트가 바뀌면 queryKey가 바뀌므로 기본값이면 매 이동마다 빈 데이터로 돌아간다 —
 * `keepPreviousData`로 새 응답이 올 때까지 직전 오버레이를 유지해 깜빡임을 없앤다.
 */
export const mapQueryPolicy = {
  staleTime: MAP_QUERY_STALE_TIME,
  placeholderData: keepPreviousData,
} as const;
