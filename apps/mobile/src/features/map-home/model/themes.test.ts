import { describe, expect, it } from "vitest";
import { palette } from "@fillmap/design-tokens";
import { THEME_IDS, THEME_META, deriveHomeTopBar } from "./themes";

/**
 * MSG-423 요구 4로 개정: 칩 선택 시 칩 행을 숨기고 테마 검색어 바로 바꾸던
 * MSG-298 동작(구 AC 5)이 Figma 정본 v2(14851:390)와 충돌해 폐기됐다 —
 * 칩 행은 선택 여부와 무관하게 항상 보이고, 선택 칩만 테마 색으로 채워진다.
 * 검색바는 기본 검색바를 유지한다(테마 검색어 바 없음).
 */
describe("홈 상단 상태 파생 (themes)", () => {
  it("테마 메타는 칩 4종(핫구역·지역축제·팝업스토어·경로추천)과 테마 색 토큰을 정의한다", () => {
    expect(THEME_IDS).toEqual(["hot", "festival", "popup", "route"]);
    expect(THEME_META.hot).toEqual({
      id: "hot",
      label: "핫구역",
      color: palette["theme-hot"],
    });
    expect(THEME_META.festival.label).toBe("지역축제");
    expect(THEME_META.festival.color).toBe(palette["theme-festival"]);
    expect(THEME_META.popup.label).toBe("팝업스토어");
    expect(THEME_META.popup.color).toBe(palette["theme-popup"]);
    expect(THEME_META.route.label).toBe("경로추천");
    expect(THEME_META.route.color).toBe(palette["theme-route"]);
  });

  it("테마 미선택(null)이면 칩 행을 표시한다 (L8)", () => {
    expect(deriveHomeTopBar(null)).toEqual({ showChips: true });
  });

  it("테마 4종 어느 것을 선택해도 칩 행은 계속 표시된다 — 칩 행 숨김 폐기 (L8)", () => {
    for (const id of THEME_IDS) {
      expect(deriveHomeTopBar(id)).toEqual({ showChips: true });
    }
  });
});
