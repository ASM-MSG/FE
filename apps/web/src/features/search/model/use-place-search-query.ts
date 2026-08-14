import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { searchPlacesOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { PlaceSearchResponseDto } from "@/shared/api/generated/types.gen";
import { useDebouncedValue } from "@/shared/use-debounced-value";

/**
 * 검색어 디바운스 (스펙 추정 4) — 백엔드가 카카오 프록시(장애 시 502)라
 * 타이핑마다 호출하지 않도록 입력 변경을 이 시간만큼 눌러서 조회한다.
 */
export const PLACE_SEARCH_DEBOUNCE_MS = 300;

export interface PlaceSearchResult {
  /** 검색 결과(장소명·주소·좌표) — 활성 검색의 응답 미도착이면 undefined */
  places: PlaceSearchResponseDto[] | undefined;
  isError: boolean;
  retry: () => void;
  /** 디바운스 대기를 건너뛰는 즉시 검색 — Enter·검색 아이콘·인기 검색어 클릭 (AC 14) */
  searchNow: (q: string) => void;
}

/**
 * 장소 검색 쿼리 (MSG-328 AC 15~17) — `GET /api/search/places?q=`.
 * 입력을 300ms 디바운스한 뒤 조회하고, 빈 검색어는 비활성이다(스펙 명시).
 * enabled=false(비로그인·드롭다운 닫힘)면 조회하지 않는다 — 익명 401 실측에 따른 게이트.
 * 지도 SDK를 import하지 않는다(RN 경계).
 */
export const usePlaceSearchQuery = (
  input: string,
  enabled: boolean,
): PlaceSearchResult => {
  const { debounced, flush } = useDebouncedValue(
    input,
    PLACE_SEARCH_DEBOUNCE_MS,
  );
  const q = debounced.trim();

  const query = useQuery({
    ...searchPlacesOptions({ query: { q } }),
    select: unwrapEnvelope,
    enabled: enabled && q.length > 0,
  });

  return {
    places: query.data,
    isError: query.isError,
    retry: () => void query.refetch(),
    searchNow: flush,
  };
};
