import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEX_TAB,
  DEX_TAB_ITEMS,
  selectDexTab,
  type DexTab,
} from "./dex-tab";

/**
 * AC 1: dex 탭 상태의 기본값은 `map`이고, `badge` 선택 시 `badge`로,
 * 다시 `map` 선택 시 `map`으로 전환된다. 칩 목록은 [지도, 뱃지] 순서·2개다
 * (2026-08-05 시안 개정 — 갤러리 탭 제거). 칩 상태는 화면 로컬·비영속(추정 5)이라
 * 전이는 순수 함수로 두고 화면이 useState로 보관한다.
 */
describe("AC 1 도감 탭 전환 모델 (dex-tab)", () => {
  it('기본값은 "map"이다', () => {
    expect(DEFAULT_DEX_TAB).toBe("map");
  });

  it("badge 선택 시 badge로, 다시 map 선택 시 map으로 전환된다", () => {
    const afterBadge: DexTab = selectDexTab(DEFAULT_DEX_TAB, "badge");
    expect(afterBadge).toBe("badge");
    expect(selectDexTab(afterBadge, "map")).toBe("map");
  });

  it("이미 활성인 탭을 다시 선택해도 그대로 유지된다", () => {
    expect(selectDexTab("map", "map")).toBe("map");
    expect(selectDexTab("badge", "badge")).toBe("badge");
  });

  it("칩 목록은 [지도, 뱃지] 순서·2개다", () => {
    expect(DEX_TAB_ITEMS.map((item) => item.label)).toEqual(["지도", "뱃지"]);
    expect(DEX_TAB_ITEMS.map((item) => item.key)).toEqual(["map", "badge"]);
  });
});
