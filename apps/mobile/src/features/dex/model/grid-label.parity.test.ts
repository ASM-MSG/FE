import { describe, expect, it } from "vitest";
import { gridLabel } from "./grid-label";

/**
 * L6 parity: 모바일 `gridLabel` ↔ 웹 `features/region/model/grid-card.ts`의
 * `gridCardLabel` 동등성 (티켓 포팅 슬롯 "gallery"의 의존 모듈).
 * 이름이 다른 이유: 모바일에는 "격자 카드" 개념이 없고 갤러리 섹션 헤더 라벨이
 * 유일 소비처라 역할 이름을 쓴다. 동등성은 이 테스트가 고정한다.
 */
interface WebGridCardModule {
  gridCardLabel: typeof gridLabel;
}

const WEB_GRID_CARD_PATH = new URL(
  "../../../../../web/src/features/region/model/grid-card.ts",
  import.meta.url,
).pathname;

const loadWebGridCard = (): Promise<WebGridCardModule> =>
  import(WEB_GRID_CARD_PATH);

describe("gridLabel 동등성 (L6)", () => {
  it("4조합(쌍 존재/zoneName null/zoneCell null/둘 다 null)에서 웹 원본과 동일하다 (L6)", async () => {
    const web = await loadWebGridCard();
    const combos: [string | null, string | null][] = [
      ["서면", "A-14"],
      [null, "A-14"],
      ["서면", null],
      [null, null],
    ];

    for (const [zoneName, zoneCell] of combos) {
      expect(gridLabel(zoneName, zoneCell, "부전2동")).toBe(
        web.gridCardLabel(zoneName, zoneCell, "부전2동"),
      );
    }
  });
});
