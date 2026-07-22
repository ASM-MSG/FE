import { describe, expect, it } from "vitest";
import { DEX_TABS, dexTabPath, parseDexTab } from "./dex-tab";

describe("dex-tab — 탭 경로 해석 (AC 2)", () => {
  it("파라미터가 없으면(/dex) 지도 탭이다", () => {
    expect(parseDexTab(undefined)).toBe("map");
  });

  it("'gallery' 파라미터(/dex/gallery)는 갤러리 탭이다", () => {
    expect(parseDexTab("gallery")).toBe("gallery");
  });

  it("'badges' 파라미터(/dex/badges)는 뱃지 탭이다", () => {
    expect(parseDexTab("badges")).toBe("badges");
  });

  it("무효 탭 파라미터는 지도 탭으로 폴백한다", () => {
    expect(parseDexTab("unknown")).toBe("map");
    expect(parseDexTab("")).toBe("map");
    expect(parseDexTab("MAP")).toBe("map");
  });

  it("탭 경로 매핑: 지도→/dex, 갤러리→/dex/gallery, 뱃지→/dex/badges", () => {
    expect(dexTabPath("map")).toBe("/dex");
    expect(dexTabPath("gallery")).toBe("/dex/gallery");
    expect(dexTabPath("badges")).toBe("/dex/badges");
  });

  it("모든 탭의 경로는 다시 그 탭으로 해석된다 (경로↔탭 왕복 일관성)", () => {
    for (const tab of DEX_TABS) {
      const path = dexTabPath(tab);
      const param = path === "/dex" ? undefined : path.replace("/dex/", "");
      expect(parseDexTab(param)).toBe(tab);
    }
  });
});
