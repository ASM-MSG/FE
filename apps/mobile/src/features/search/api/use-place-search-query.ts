import { queryOptions, useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { searchPlacesOptions } from "../../../shared/api/query-options";
import type { PlaceSearchResponseDto } from "../../../shared/api/sdk";
import { useDebouncedValue } from "../../../shared/use-debounced-value";

/**
 * 검색어 디바운스 — 백엔드가 카카오 프록시(장애 시 502)라 타이핑마다 호출하지 않도록
 * 입력 변경을 이 시간만큼 눌러서 조회한다 (웹 MSG-328과 동일).
 */
export const PLACE_SEARCH_DEBOUNCE_MS = 300;

/**
 * 장소 검색 쿼리 옵션 (MSG-578 D6, L2) — `GET /api/search/places?q=`. 빈 검색어는 비활성.
 * 팩토리로 분리한 이유: 모바일은 RN 렌더 테스트가 없어 `QueryObserver`로 같은 옵션을 구동한다.
 */
export const placeSearchQueryOptions = (q: string) =>
  queryOptions({
    ...searchPlacesOptions({ query: { q } }),
    select: unwrapEnvelope,
    enabled: q.length > 0,
  });

export interface PlaceSearchResult {
  /** 검색 결과(장소명·주소·좌표) — 활성 검색의 응답 미도착이면 undefined */
  places: PlaceSearchResponseDto[] | undefined;
  isError: boolean;
  retry: () => void;
  /** 디바운스 대기를 건너뛰는 즉시 검색 — Enter·검색 아이콘·인기 검색어·최근 검색 탭 */
  searchNow: (q: string) => void;
}

/**
 * 장소 검색 (웹 `usePlaceSearchQuery` 이식) — 입력을 300ms 디바운스한 뒤 조회한다.
 * 인증 게이트 없음(앱은 로그인 필수 — 실측 ⑬). 지도 SDK를 import하지 않는다.
 */
export const usePlaceSearchQuery = (input: string): PlaceSearchResult => {
  const { debounced, flush } = useDebouncedValue(
    input,
    PLACE_SEARCH_DEBOUNCE_MS,
  );
  const query = useQuery(placeSearchQueryOptions(debounced.trim()));

  return {
    places: query.data,
    isError: query.isError,
    retry: () => void query.refetch(),
    searchNow: flush,
  };
};
