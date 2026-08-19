import { describe, expect, it } from "vitest";
import { palette } from "@fillmap/design-tokens";
import { THEME_IDS } from "./themes";
import { themeChipView, toggleTheme } from "./theme-chip-view";

/**
 * L9·L10: 칩 4종의 활성/비활성 표시값 파생 + 선택 토글 (요구 3·4).
 * 색 정본은 design-tokens 테마 원시 토큰이고, 활성 칩만 테마 색으로 채워진다.
 */
describe("themeChipView — 칩 활성/비활성 표시값 (L9)", () => {
  it("비활성 칩은 흰 배경 + 기본 라벨색이고 아이콘만 테마 정색이다", () => {
    expect(themeChipView("hot", false)).toEqual({
      bg: "bg-background",
      label: "text-foreground",
      icon: palette["theme-hot"],
    });
  });

  it("활성 칩은 테마 색으로 채워지고 라벨·아이콘이 on-primary(흰색)가 된다", () => {
    expect(themeChipView("hot", true)).toEqual({
      bg: "bg-theme-hot",
      label: "text-primary-foreground",
      icon: palette.white,
    });
  });

  it("칩 4종의 아이콘 색이 #FF3B30·#AF52DE·#FF9500·#34C759와 일치한다", () => {
    expect(THEME_IDS.map((id) => themeChipView(id, false).icon)).toEqual([
      "#FF3B30",
      "#AF52DE",
      "#FF9500",
      "#34C759",
    ]);
  });

  it("칩 4종 전건에서 활성 배경 클래스가 그 테마 색 토큰을 가리킨다", () => {
    expect(THEME_IDS.map((id) => themeChipView(id, true).bg)).toEqual([
      "bg-theme-hot",
      "bg-theme-festival",
      "bg-theme-popup",
      "bg-theme-route",
    ]);
  });

  it("활성 칩 하나를 정해도 나머지 칩의 표시값은 비활성 그대로다", () => {
    const views = THEME_IDS.map((id) => themeChipView(id, id === "festival"));

    expect(views.filter((view) => view.bg === "bg-background")).toHaveLength(3);
  });
});

describe("toggleTheme — 칩 선택 토글 (L10)", () => {
  it("같은 칩을 다시 탭하면 선택이 해제된다(null)", () => {
    expect(toggleTheme("hot", "hot")).toBeNull();
  });

  it("다른 칩을 탭하면 그 칩으로 전환된다", () => {
    expect(toggleTheme("hot", "route")).toBe("route");
  });

  it("선택이 없을 때 탭하면 그 칩이 선택된다", () => {
    expect(toggleTheme(null, "popup")).toBe("popup");
  });
});
