import { beforeEach, describe, expect, it } from "vitest";
import { MOCK_CELLS } from "@/entities/cell";
import { selectExploreCells } from "./explore-cells";
import { useExploreFilterStore } from "./explore-filter-store";

const reset = () => useExploreFilterStore.getState().reset();
const state = () => useExploreFilterStore.getState();

describe("explore-filter-store 액션", () => {
  beforeEach(reset);

  it("applySearch: 검색어를 query에 반영하고 최근 검색 맨 앞에 추가한다 (AC 6, 11)", () => {
    state().applySearch("성수");
    expect(state().query).toBe("성수");
    expect(state().recentSearches[0]).toBe("성수");
  });

  it("applySearch: 검색은 지역 선택을 초기화한다(단일 필터 기준)", () => {
    state().selectRegion("마포구");
    state().applySearch("성수");
    expect(state().selectedRegion).toBeNull();
  });

  it("selectRegion: 지역을 선택하면 검색어를 초기화한다 (AC 5, D4)", () => {
    state().applySearch("성수");
    state().selectRegion("마포구");
    expect(state().selectedRegion).toBe("마포구");
    expect(state().query).toBe("");
  });

  it("removeRecentSearch: 지정 항목만 제거하고 나머지 순서는 보존한다 (AC 7, 12)", () => {
    state().clearRecentSearches();
    state().applySearch("강남");
    state().applySearch("성수");
    state().applySearch("홍대");
    state().removeRecentSearch("성수");
    expect(state().recentSearches).toEqual(["홍대", "강남"]);
  });

  it("clearRecentSearches: 최근 검색을 모두 비운다 (AC 8, 13)", () => {
    state().applySearch("성수");
    state().clearRecentSearches();
    expect(state().recentSearches).toEqual([]);
  });

  it("clearFilters: 검색어·지역 필터만 초기화하고 최근 기록은 유지한다 (탐색 재진입 시맨틱)", () => {
    state().applySearch("성수");
    state().selectRegion("마포구");
    state().clearFilters();
    expect(state().query).toBe("");
    expect(state().selectedRegion).toBeNull();
    expect(state().recentSearches[0]).toBe("성수");
  });
});

describe("지역/검색 필터가 selectExploreCells 입력에 반영된다 (AC 16)", () => {
  beforeEach(reset);

  it("지역 선택 시 결과가 해당 구의 격자로 좁혀진다", () => {
    state().selectRegion("마포구");
    const { query, selectedRegion } = state();
    const result = selectExploreCells(MOCK_CELLS, {
      query,
      order: "popular",
      district: selectedRegion,
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((c) => c.district === "마포구")).toBe(true);
  });

  it("검색어 선택 시 결과가 해당 검색어 매칭 격자로 좁혀진다", () => {
    state().applySearch("성수");
    const { query, selectedRegion } = state();
    const result = selectExploreCells(MOCK_CELLS, {
      query,
      order: "popular",
      district: selectedRegion,
    });
    expect(result.every((c) => c.label.includes("성수"))).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});
