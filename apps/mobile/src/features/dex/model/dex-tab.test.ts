import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEX_TAB,
  DEX_TAB_ITEMS,
  selectDexTab,
  type DexTab,
} from "./dex-tab";

/**
 * L10: `DEX_TAB_ITEMS`가 `[지도, 뱃지, 기록]` 3개를 이 순서로 고정하고
 * `DEFAULT_DEX_TAB === "map"`, `selectDexTab(current, key) === key`(활성 재탭 포함).
 * MSG-425에서 2탭(map/badge) → 3탭(map/badges/history)으로 개편했고, 키는 웹
 * `DEX_TABS`에 맞춰 `badge` → `badges`로 정정했다. 탭 상태는 화면 로컬·비영속(추정 A2)이라
 * 전이는 순수 함수로 두고 화면이 useState로 보관한다.
 */
describe("L10 도감 탭 전환 모델 (dex-tab)", () => {
  it('기본값은 "map"이다 (L10)', () => {
    expect(DEFAULT_DEX_TAB).toBe("map");
  });

  it("탭 목록은 [지도, 뱃지, 기록] 순서·3개다 (L10)", () => {
    expect(DEX_TAB_ITEMS.map((item) => item.label)).toEqual([
      "지도",
      "뱃지",
      "기록",
    ]);
    expect(DEX_TAB_ITEMS.map((item) => item.key)).toEqual([
      "map",
      "badges",
      "history",
    ]);
  });

  it("선택한 탭이 곧 다음 상태다 (L10)", () => {
    const afterBadges: DexTab = selectDexTab(DEFAULT_DEX_TAB, "badges");
    expect(afterBadges).toBe("badges");
    expect(selectDexTab(afterBadges, "history")).toBe("history");
    expect(selectDexTab("history", "map")).toBe("map");
  });

  it("이미 활성인 탭을 다시 선택해도 그대로 유지된다 (L10)", () => {
    expect(selectDexTab("map", "map")).toBe("map");
    expect(selectDexTab("badges", "badges")).toBe("badges");
    expect(selectDexTab("history", "history")).toBe("history");
  });
});
