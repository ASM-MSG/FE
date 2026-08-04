import { describe, expect, it } from "vitest";
import * as mobileHistory from "./recent-history";

/**
 * AC 7: 모바일 recent-history ↔ 웹 원본 동등성 (스펙 구현 계획 — 복제 + 동등성 테스트,
 * grid.parity.test.ts 선례). 최근 검색 규칙(상한 10, 중복 맨 앞 이동, 빈 검색어 무시)이
 * 웹과 동일함을 함수 결과 비교로 보증한다.
 *
 * 웹 원본은 변수 경로 동적 import로 로드한다(grid.parity 선례) — 웹 파일이 이동하면
 * 이 테스트가 깨져 드리프트를 감지한다.
 */
const WEB_HISTORY_PATH = new URL(
  "../../../../../web/src/features/explore/model/recent-history.ts",
  import.meta.url,
).pathname;
const loadWebHistory = (): Promise<typeof mobileHistory> =>
  import(WEB_HISTORY_PATH);

describe("recent-history 동등성 (AC 7)", () => {
  it("보관 상한 MAX_RECENT_SEARCHES가 10이고 웹 원본과 동일하다", async () => {
    const webHistory = await loadWebHistory();
    expect(mobileHistory.MAX_RECENT_SEARCHES).toBe(10);
    expect(mobileHistory.MAX_RECENT_SEARCHES).toBe(
      webHistory.MAX_RECENT_SEARCHES,
    );
  });

  it("addRecentSearch: 검색어 제출 시 맨 앞 추가·중복 맨 앞 이동·상한 초과 제거·빈 검색어 무시가 웹과 동일하다 (AC 7)", async () => {
    const webHistory = await loadWebHistory();
    const samples: { searches: string[]; term: string }[] = [
      { searches: ["광안리", "서면"], term: "해운대" }, // 신규 → 맨 앞
      { searches: ["광안리", "서면", "해운대"], term: "서면" }, // 중복 → 맨 앞 이동
      {
        searches: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
        term: "k",
      }, // 상한 초과 → 오래된 항목 제거
      { searches: ["광안리"], term: "" }, // 빈 검색어 무시
      { searches: ["광안리"], term: "   " }, // 공백 검색어 무시
      { searches: [], term: "  서면  " }, // trim 후 추가
    ];
    for (const { searches, term } of samples) {
      expect(mobileHistory.addRecentSearch(searches, term)).toEqual(
        webHistory.addRecentSearch(searches, term),
      );
    }
    // 규칙 자체 단정 — 상한 10 유지·맨 앞 최신
    expect(
      mobileHistory.addRecentSearch(
        ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
        "k",
      ),
    ).toEqual(["k", "a", "b", "c", "d", "e", "f", "g", "h", "i"]);
  });

  it("removeRecentSearch: 해당 항목만 제거하고 나머지 순서를 보존한다 — 웹과 동일 (AC 5)", async () => {
    const webHistory = await loadWebHistory();
    const searches = ["광안리", "서면", "해운대"];
    expect(mobileHistory.removeRecentSearch(searches, "서면")).toEqual(
      webHistory.removeRecentSearch(searches, "서면"),
    );
    expect(mobileHistory.removeRecentSearch(searches, "서면")).toEqual([
      "광안리",
      "해운대",
    ]);
  });

  it("clearRecentSearches·isHistoryEmpty: 전체 삭제와 빈 판정이 웹과 동일하다 (AC 6·8)", async () => {
    const webHistory = await loadWebHistory();
    expect(mobileHistory.clearRecentSearches()).toEqual(
      webHistory.clearRecentSearches(),
    );
    expect(mobileHistory.isHistoryEmpty([])).toBe(
      webHistory.isHistoryEmpty([]),
    );
    expect(mobileHistory.isHistoryEmpty(["서면"])).toBe(
      webHistory.isHistoryEmpty(["서면"]),
    );
  });
});
