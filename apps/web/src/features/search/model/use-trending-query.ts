import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getTrendingKeywordsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { TrendingKeywordResponseDto } from "@/shared/api/generated/types.gen";

export interface TrendingResult {
  /** 인기 검색어 TOP 10(순위·검색어) — 미도착이면 undefined, 빈 집계면 빈 배열 (AC 13) */
  keywords: TrendingKeywordResponseDto[] | undefined;
  isError: boolean;
}

/**
 * 인기 검색어 조회 (MSG-328 AC 13) — `GET /api/search/trending`.
 * 검색바 포커스 + 입력 없음일 때만 활성화한다(enabled — 비로그인 게이트 포함).
 * trending은 좌표를 싣지 않는 백엔드 계약이라 파라미터가 없다.
 * 지도 SDK를 import하지 않는다(RN 경계).
 */
export const useTrendingQuery = (enabled: boolean): TrendingResult => {
  const query = useQuery({
    ...getTrendingKeywordsOptions(),
    select: unwrapEnvelope,
    enabled,
  });

  return {
    keywords: query.data,
    isError: query.isError,
  };
};
