import { describe, expect, it } from "vitest";
import {
  addRecentSearch,
  clearRecentSearches,
  isHistoryEmpty,
  MAX_RECENT_SEARCHES,
  removeRecentSearch,
} from "./recent-history";

describe("addRecentSearch (AC 11)", () => {
  it("검색어를 최근 검색 목록 맨 앞에 추가한다", () => {
    expect(addRecentSearch(["광안리", "해운대"], "서면")).toEqual([
      "서면",
      "광안리",
      "해운대",
    ]);
  });

  it("이미 존재하는 검색어는 중복 없이 맨 앞(최신)으로 이동시킨다", () => {
    expect(addRecentSearch(["광안리", "해운대", "서면"], "해운대")).toEqual([
      "해운대",
      "광안리",
      "서면",
    ]);
  });

  it("상한(10개)을 초과하면 가장 오래된 항목을 버린다", () => {
    const full = Array.from({ length: MAX_RECENT_SEARCHES }, (_, i) => `검색${i}`);
    const result = addRecentSearch(full, "새검색");
    expect(result).toHaveLength(MAX_RECENT_SEARCHES);
    expect(result[0]).toBe("새검색");
    expect(result).not.toContain(`검색${MAX_RECENT_SEARCHES - 1}`);
  });

  it("앞뒤 공백을 제거해 추가한다", () => {
    expect(addRecentSearch([], "  광안리  ")).toEqual(["광안리"]);
  });

  it("빈/공백 검색어는 무시하고 목록을 그대로 반환한다", () => {
    const list = ["광안리"];
    expect(addRecentSearch(list, "")).toEqual(list);
    expect(addRecentSearch(list, "   ")).toEqual(list);
  });
});

describe("removeRecentSearch (AC 12)", () => {
  it("지정한 항목만 제거하고 나머지 항목의 상대 순서는 보존한다", () => {
    expect(removeRecentSearch(["서면", "광안리", "해운대"], "광안리")).toEqual([
      "서면",
      "해운대",
    ]);
  });

  it("존재하지 않는 항목 제거 시 목록을 그대로 반환한다", () => {
    expect(removeRecentSearch(["서면", "광안리"], "없음")).toEqual([
      "서면",
      "광안리",
    ]);
  });
});

describe("clearRecentSearches (AC 13)", () => {
  it("최근 검색 목록을 빈 배열로 만든다", () => {
    expect(clearRecentSearches()).toEqual([]);
  });
});

describe("isHistoryEmpty 빈 상태 판정 (AC 14)", () => {
  it("목록 길이가 0이면 true를 반환한다", () => {
    expect(isHistoryEmpty([])).toBe(true);
  });

  it("항목이 하나라도 있으면 false를 반환한다", () => {
    expect(isHistoryEmpty(["광안리"])).toBe(false);
  });
});
