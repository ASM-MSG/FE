import { useSyncExternalStore } from "react";
import {
  addRecentSearch,
  clearRecentSearches,
  removeRecentSearch,
} from "./recent-history";

/**
 * 최근 검색 스토어 — 비영속 인메모리 (D-Q2: AsyncStorage 영속화는 범위 밖, 후속 환류).
 * apps/mobile에는 zustand가 없어(스펙 리스크 1) 모듈 스코프 팩토리 + useSyncExternalStore
 * 구독 훅으로 구현한다. 상태 전이는 전부 recent-history 순수 함수에 위임한다.
 * 라우터·플랫폼 API를 참조하지 않는다 (RN 경계 규칙 — react 훅은 플랫폼 중립).
 */

/** 최근 검색 목 시드 — 웹 explore-filter-store와 동일(광안리·서면·해운대, 스펙 승인 추정 2) */
export const MOCK_RECENT_SEARCHES: string[] = ["광안리", "서면", "해운대"];

export interface SearchStore {
  getRecentSearches: () => string[];
  subscribe: (listener: () => void) => () => void;
  /** 검색어 제출 — 맨 앞 추가·중복 이동·상한·빈 검색어 무시는 recent-history 규칙 [AC 7·11] */
  submitSearch: (term: string) => void;
  /** 항목 X 탭 — 해당 항목만 삭제, 순서 보존 [AC 5] */
  removeSearch: (term: string) => void;
  /** 전체 삭제 [AC 6] */
  clearSearches: () => void;
}

/** 스토어 팩토리 — 테스트는 격리 인스턴스를, 앱은 아래 단일 인스턴스를 쓴다 */
export const createSearchStore = (
  seed: string[] = MOCK_RECENT_SEARCHES,
): SearchStore => {
  let recentSearches = [...seed];
  const listeners = new Set<() => void>();

  const setSearches = (next: string[]) => {
    // addRecentSearch는 빈·공백 검색어에 동일 참조를 반환한다 — 변화 없으면 통지 생략
    if (next === recentSearches) return;
    recentSearches = next;
    listeners.forEach((listener) => listener());
  };

  return {
    getRecentSearches: () => recentSearches,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    submitSearch: (term) => setSearches(addRecentSearch(recentSearches, term)),
    removeSearch: (term) =>
      setSearches(removeRecentSearch(recentSearches, term)),
    clearSearches: () => setSearches(clearRecentSearches()),
  };
};

/** 앱 전역 단일 인스턴스 — 화면 재진입에도 유지되는 세션 상태 (비영속, D-Q2) */
export const searchStore = createSearchStore();

/** 최근 검색 구독 훅 — 검색 화면이 목록·섹션 표시(AC 4·8)에 사용한다 */
export const useRecentSearches = (): string[] =>
  useSyncExternalStore(searchStore.subscribe, searchStore.getRecentSearches);
