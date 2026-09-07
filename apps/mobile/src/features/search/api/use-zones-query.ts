import { queryOptions, useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getZonesOptions } from "../../../shared/api/query-options";
import type { ZoneResponseDto } from "../../../shared/api/sdk";

const EMPTY_ZONES: ZoneResponseDto[] = [];

/**
 * 전체 구역 목록 쿼리 옵션 (MSG-578 D6, L3) — `GET /api/zones`, 48건 수준 정적 목록.
 * staleTime·gcTime Infinity — 로그인 세션에서 검색 화면 첫 마운트 시 1회만 요청하고
 * 재마운트·재입력에도 재요청이 없다.
 */
export const zonesQueryOptions = () =>
  queryOptions({
    ...getZonesOptions(),
    select: unwrapEnvelope,
    staleTime: Infinity,
    gcTime: Infinity,
  });

/** 미도착·실패면 빈 배열 — 격자 섹션이 조용히 비활성(시딩 전과 같은 표시) */
export const zonesOrEmpty = (
  data: ZoneResponseDto[] | undefined,
): ZoneResponseDto[] => data ?? EMPTY_ZONES;

/** zones 조회 (웹 `useZonesQuery` 이식) — 인증 게이트 없음(앱은 로그인 필수). 지도 SDK 미참조 */
export const useZonesQuery = (): ZoneResponseDto[] =>
  zonesOrEmpty(useQuery(zonesQueryOptions()).data);
