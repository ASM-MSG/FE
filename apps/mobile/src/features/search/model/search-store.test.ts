import { describe, expect, it, vi } from "vitest";
import { MOCK_RECENT_SEARCHES, createSearchStore } from "./search-store";

/**
 * AC 4~8·11: 최근 검색 스토어 — 비영속 인메모리(D-Q2), recent-history 순수 함수로 전이.
 * 테스트는 팩토리(createSearchStore)로 격리 인스턴스를 만든다(앱은 단일 인스턴스 사용).
 */
describe("search-store (AC 4~8·11, D-Q2)", () => {
  it("초기 최근 검색은 웹과 동일한 목 시드(광안리·서면·해운대) 최신순이다 (AC 4)", () => {
    const store = createSearchStore();
    expect(store.getRecentSearches()).toEqual(["광안리", "서면", "해운대"]);
    expect(MOCK_RECENT_SEARCHES).toEqual(["광안리", "서면", "해운대"]);
  });

  it("submitSearch: 검색어가 맨 앞에 추가되고 구독자에게 통지된다 (AC 7)", () => {
    const store = createSearchStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.submitSearch("전포동");
    expect(store.getRecentSearches()).toEqual([
      "전포동",
      "광안리",
      "서면",
      "해운대",
    ]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("submitSearch: 중복 검색어는 맨 앞으로 이동한다 — 최근 검색 탭 재제출 포함 (AC 7·11)", () => {
    const store = createSearchStore();
    store.submitSearch("해운대");
    expect(store.getRecentSearches()).toEqual(["해운대", "광안리", "서면"]);
  });

  it("submitSearch: 빈·공백 검색어는 무시되고 통지도 없다 (AC 7)", () => {
    const store = createSearchStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.submitSearch("   ");
    expect(store.getRecentSearches()).toEqual(["광안리", "서면", "해운대"]);
    expect(listener).not.toHaveBeenCalled();
  });

  it("removeSearch: 해당 항목만 삭제되고 나머지 순서는 보존된다 (AC 5)", () => {
    const store = createSearchStore();
    store.removeSearch("서면");
    expect(store.getRecentSearches()).toEqual(["광안리", "해운대"]);
  });

  it("clearSearches: 최근 검색이 모두 삭제되어 빈 목록이 된다 (AC 6·8)", () => {
    const store = createSearchStore();
    store.clearSearches();
    expect(store.getRecentSearches()).toEqual([]);
  });

  it("구독 해지 후에는 통지받지 않는다", () => {
    const store = createSearchStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.submitSearch("전포동");
    expect(listener).not.toHaveBeenCalled();
  });
});
