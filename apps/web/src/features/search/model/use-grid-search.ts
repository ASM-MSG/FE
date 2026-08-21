import { useMemo } from "react";
import { useZonesQuery } from "./use-zones-query";
import { deriveGridSearchResults, type GridSearchResult } from "./zone-search";

/**
 * 격자 검색 (MSG-412 AC 8) — 입력 문자열 + zones 캐시 → 격자/구역 매치 목록 파생.
 * 서버 검색 API가 없어 로컬 역파싱이다 — 48건 필터라 디바운스 없이 즉시 반영한다.
 * zones 조회는 useZonesQuery가 세션 1회 캐시(비로그인 미발사)로 소유한다.
 * 지도 SDK를 import하지 않는다(RN 경계).
 */
export const useGridSearch = (input: string): GridSearchResult[] => {
  const zones = useZonesQuery();
  return useMemo(() => deriveGridSearchResults(zones, input), [zones, input]);
};
