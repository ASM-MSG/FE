/**
 * 최근 검색 목록 상태 전이 — 순수 함수. 웹 `apps/web/src/features/explore/model/recent-history.ts`의
 * 복제본 (MSG-297 — grid.ts와 같은 방식: 복제 + 동등성 테스트, 공유 패키지 승격 아님).
 * 웹 동등성은 recent-history.parity.test.ts가 웹 원본을 직접 import해 단정한다 —
 * 웹 쪽 변경 시 테스트가 깨져 드리프트를 감지한다.
 * 플랫폼 API를 참조하지 않는다 — search-store가 이 헬퍼로 최근 검색을 갱신한다.
 */

/** 최근 검색 보관 상한 (최신순 상단, 초과 시 오래된 항목부터 제거) */
export const MAX_RECENT_SEARCHES = 10;

/**
 * 검색어를 최근 검색 목록 맨 앞에 추가한다. [AC 7]
 * 이미 존재하는 검색어는 중복 없이 맨 앞(최신)으로 이동시키고, 상한을 넘으면 오래된 항목을 버린다.
 * 빈/공백 검색어는 무시한다.
 */
export const addRecentSearch = (searches: string[], term: string): string[] => {
  const t = term.trim();
  if (!t) return searches;
  return [t, ...searches.filter((s) => s !== t)].slice(0, MAX_RECENT_SEARCHES);
};

/**
 * 지정한 항목만 제거하고 나머지 항목의 상대 순서는 보존한다. [AC 5]
 */
export const removeRecentSearch = (
  searches: string[],
  term: string,
): string[] => searches.filter((s) => s !== term);

/** 최근 검색 목록을 빈 배열로 만든다. [AC 6] */
export const clearRecentSearches = (): string[] => [];

/** 목록 길이가 0이면 "빈 상태" 신호(true)를 반환한다. [AC 8] */
export const isHistoryEmpty = (list: string[]): boolean => list.length === 0;
