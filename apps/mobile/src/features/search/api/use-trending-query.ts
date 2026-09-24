import { queryOptions, useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getTrendingKeywordsOptions } from "../../../shared/api/query-options";
import type { TrendingKeywordResponseDto } from "../../../shared/api/sdk";

/** 인기 검색어 쿼리 옵션 (MSG-578 D6) — `GET /api/search/trending`, 파라미터 없음(좌표를 싣지 않는 백엔드 계약) */
export const trendingQueryOptions = () =>
  queryOptions({ ...getTrendingKeywordsOptions(), select: unwrapEnvelope });

export interface TrendingResult {
  /** 인기 검색어 TOP 10(순위·검색어) — 미도착이면 undefined, 빈 집계면 빈 배열 */
  keywords: TrendingKeywordResponseDto[] | undefined;
  isError: boolean;
}

/**
 * 인기 검색어 조회 (웹 `useTrendingQuery` 이식) — 검색 화면 마운트 + 입력 없음일 때만
 * 활성화한다(D15). 인증 게이트 없음(앱은 로그인 필수). 지도 SDK를 import하지 않는다.
 */
export const useTrendingQuery = (enabled: boolean): TrendingResult => {
  const query = useQuery({ ...trendingQueryOptions(), enabled });
  return { keywords: query.data, isError: query.isError };
};
