import { describe, expect, it } from "vitest";
import { palette, spacing } from "@fillmap/design-tokens";
import { HOME_TOP_BAR_HEIGHT, THEME_IDS, THEME_META } from "./themes";

/**
 * MSG-423 요구 4로 개정: 칩 선택 시 칩 행을 숨기고 테마 검색어 바로 바꾸던
 * MSG-298 동작(구 AC 5)이 Figma 정본 v2(14851:390)와 충돌해 폐기됐다 —
 * 칩 행은 선택 여부와 무관하게 항상 보이고, 선택 칩만 테마 색으로 채워진다.
 *
 * MSG-427(F4): 그 폐기 뒤 상수만 돌려주던 `deriveHomeTopBar` 단정 2건을 함께 걷었다 —
 * 파생이 사라졌으므로 검증할 동작도 없다. 칩 행 상시 표시는 이제 화면이 직접 렌더한다.
 */
describe("테마 칩 메타 (themes)", () => {
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
  /**
   * PR #76 리뷰 반영 — 상단 바를 피해 오버레이를 놓는 오프셋이 매직 넘버로 굳는 것을 막는다.
   * 토큰에서 온 값(`spacing.sm`)이 바뀌면 상수가 따라 움직여야 하므로 산술로 대조한다.
   *
   * 한계(정직하게 기록): SearchBar `h-12`(48)·ThemeChip `h-9.5`(38)는 NativeWind
   * className 스케일에서 오는 값이라 import할 수 없다. 두 컴포넌트의 높이 클래스가
   * 바뀌면 이 테스트는 잡지 못하고, 상수 주석에 적힌 출처 className을 따라가야 한다.
   */
  it("상단 바 높이 상수는 spacing.sm 토큰에서 합성된다 — 토큰 드리프트 감지", () => {
    const SEARCH_BAR_HEIGHT = 48; // ui-native SearchBar `h-12`
    const CHIP_HEIGHT = 38; // ThemeChip `h-9.5`
    expect(HOME_TOP_BAR_HEIGHT).toBe(
      spacing.sm * 2 + SEARCH_BAR_HEIGHT + CHIP_HEIGHT,
    );
  });
});
