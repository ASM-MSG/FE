import { describe, expect, it } from "vitest";
import { DEX_TABS, dexTabPath, parseDexTab } from "./dex-tab";

describe("dex-tab — 탭 경로 해석 (AC 2, MSG-122 ② 2탭 개정)", () => {
  it("파라미터가 없으면(/dex) 지도 탭이다", () => {
    expect(parseDexTab(undefined)).toBe("map");
  });

  it("'gallery'는 무효 파라미터로 지도 탭에 폴백한다 — /dex/gallery 딥링크는 지도 탭으로 열린다 (MSG-122 AC 21, Q2)", () => {
    expect(parseDexTab("gallery")).toBe("map");
  });

  it("'badges' 파라미터(/dex/badges)는 뱃지 탭이다", () => {
    expect(parseDexTab("badges")).toBe("badges");
  });

  it("무효 탭 파라미터는 지도 탭으로 폴백한다", () => {
    expect(parseDexTab("unknown")).toBe("map");
    expect(parseDexTab("")).toBe("map");
    expect(parseDexTab("MAP")).toBe("map");
  });

  it("탭 경로 매핑: 지도→/dex, 뱃지→/dex/badges — 갤러리는 탭이 아니다 (MSG-122 AC 20)", () => {
    expect(dexTabPath("map")).toBe("/dex");
    expect(dexTabPath("badges")).toBe("/dex/badges");
    expect(DEX_TABS).toEqual(["map", "badges"]);
  });

  it("모든 탭의 경로는 다시 그 탭으로 해석된다 (경로↔탭 왕복 일관성)", () => {
    for (const tab of DEX_TABS) {
      const path = dexTabPath(tab);
      const param = path === "/dex" ? undefined : path.replace("/dex/", "");
      expect(parseDexTab(param)).toBe(tab);
    }
  });
});
