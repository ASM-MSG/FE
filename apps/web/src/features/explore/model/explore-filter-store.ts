import { create } from "zustand";
import { MOCK_RECENT_VISITS } from "@/entities/region";
import * as history from "./recent-history";

/**
 * 최근 검색 mock 시드 (비영속, D3) — 새로고침 시 이 목데이터로 리셋된다.
 * 라벨 부분일치 검색(searchCells)에 걸리는 용어로 두어 클릭 시 결과가 좁혀지는 것을 확인할 수 있다.
 */
const MOCK_RECENT_SEARCHES = ["성수", "홍대입구", "강남역"];

interface ExploreFilterState {
  /** 커밋된 검색어 — 탐색 패널 카드 그리드 필터 입력 */
  query: string;
  /** 선택된 행정구 필터 — null이면 지역 필터 미적용 */
  selectedRegion: string | null;
  /** 최근 방문 지역 (비영속 목데이터) */
  recentVisits: string[];
  /** 최근 검색어 (비영속, 최신순 상단) */
  recentSearches: string[];
  /** 검색어를 커밋한다(엔터/검색 아이콘) — 지역 필터를 초기화하고 최근 검색에 추가한다 (D2) */
  applySearch: (term: string) => void;
  /** 지역을 선택한다(전체 지역 행·최근 방문 칩) — 검색어를 초기화한다 (D4) */
  selectRegion: (district: string) => void;
  /** 최근 검색에서 한 항목만 제거한다 (AC 7) */
  removeRecentSearch: (term: string) => void;
  /** 최근 검색을 모두 비운다 (AC 8) */
  clearRecentSearches: () => void;
  /** 초기 목데이터 상태로 되돌린다 (테스트/새로고침 시맨틱) */
  reset: () => void;
}

const initialState = {
  query: "",
  selectedRegion: null as string | null,
  recentVisits: MOCK_RECENT_VISITS,
  recentSearches: MOCK_RECENT_SEARCHES,
};

/**
 * 탐색 필터 스토어 (비영속 인메모리, D3) — 검색어·선택 지역·최근 기록을 보관한다.
 * 상태 전이 로직은 순수 헬퍼(recent-history)로 분리해 테스트한다(AC 11~14).
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 */
export const useExploreFilterStore = create<ExploreFilterState>((set) => ({
  ...initialState,
  applySearch: (term) =>
    set((s) => ({
      query: term.trim(),
      selectedRegion: null,
      recentSearches: history.addRecentSearch(s.recentSearches, term),
    })),
  selectRegion: (district) => set({ selectedRegion: district, query: "" }),
  removeRecentSearch: (term) =>
    set((s) => ({
      recentSearches: history.removeRecentSearch(s.recentSearches, term),
    })),
  clearRecentSearches: () =>
    set({ recentSearches: history.clearRecentSearches() }),
  reset: () => set(initialState),
}));
