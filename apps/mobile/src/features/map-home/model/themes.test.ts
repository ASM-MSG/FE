import { describe, expect, it } from "vitest";
import { palette } from "@fillmap/design-tokens";
import { THEME_IDS, THEME_META, deriveHomeTopBar } from "./themes";

/**
 * AC 5: 홈 상단은 테마 미선택이면 검색바+칩 행, 선택이면 테마 검색어 바 —
 * 표시할 검색어·칩 행 표시 여부가 테마 상태로부터 결정적으로 계산된다.
 */
describe("AC 5 홈 상단 상태 파생 (themes)", () => {
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

  it("테마 미선택(null)이면 기본 모드 — 칩 행 표시", () => {
    expect(deriveHomeTopBar(null)).toEqual({
      mode: "default",
      showChips: true,
    });
  });

  it("테마 선택이면 테마 검색어 바 모드 — 칩 행 숨김 + 검색어 = 테마명", () => {
    for (const id of THEME_IDS) {
      expect(deriveHomeTopBar(id)).toEqual({
        mode: "theme",
        showChips: false,
        query: THEME_META[id].label,
      });
    }
  });
});
