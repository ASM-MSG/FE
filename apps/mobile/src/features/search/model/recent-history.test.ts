import { describe, expect, it } from "vitest";
import * as mobileHistory from "./recent-history";

/**
 * 모바일 recent-history 규칙 검증 — 원래 웹 원본과의 parity 테스트였으나, 웹의
 * features/explore/model/recent-history.ts가 탐색 제거(MSG-328)로 삭제돼 모바일이
 * 이 규칙의 단독 소유가 됐다. 웹 비교 단정만 걷어내고 규칙 계약은 그대로 고정한다.
 */
describe("recent-history 규칙 (구 웹 parity — MSG-328부터 모바일 단독)", () => {
  it("보관 상한 MAX_RECENT_SEARCHES는 10이다", () => {
    expect(mobileHistory.MAX_RECENT_SEARCHES).toBe(10);
  });

  it("addRecentSearch: 신규는 맨 앞 추가, 상한 초과 시 오래된 항목을 제거한다 (AC 7)", () => {
    expect(mobileHistory.addRecentSearch(["광안리", "서면"], "해운대")).toEqual(
      ["해운대", "광안리", "서면"],
    );
    expect(
      mobileHistory.addRecentSearch(
        ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
        "k",
      ),
    ).toEqual(["k", "a", "b", "c", "d", "e", "f", "g", "h", "i"]);
  });

  it("addRecentSearch: 중복은 맨 앞 이동, 빈/공백 검색어는 무시, trim 후 추가한다 (AC 7)", () => {
    expect(
      mobileHistory.addRecentSearch(["광안리", "서면", "해운대"], "서면"),
    ).toEqual(["서면", "광안리", "해운대"]);
    expect(mobileHistory.addRecentSearch(["광안리"], "")).toEqual(["광안리"]);
    expect(mobileHistory.addRecentSearch(["광안리"], "   ")).toEqual([
      "광안리",
    ]);
    expect(mobileHistory.addRecentSearch([], "  서면  ")).toEqual(["서면"]);
  });

  it("removeRecentSearch: 해당 항목만 제거하고 나머지 순서를 보존한다 (AC 5)", () => {
    expect(
      mobileHistory.removeRecentSearch(["광안리", "서면", "해운대"], "서면"),
    ).toEqual(["광안리", "해운대"]);
  });

  it("clearRecentSearches는 빈 배열, isHistoryEmpty는 빈 배열만 true다 (AC 6·8)", () => {
    expect(mobileHistory.clearRecentSearches()).toEqual([]);
    expect(mobileHistory.isHistoryEmpty([])).toBe(true);
    expect(mobileHistory.isHistoryEmpty(["서면"])).toBe(false);
  });
});
