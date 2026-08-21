import { describe, expect, it } from "vitest";
import { viewportGridRange } from "./grid-5179";
import type { Bounds } from "./grid";

/**
 * F-11: `viewportGridRange`(뷰포트 → 5179 셀 인덱스 범위)가 웹 원본과 같은 입력에
 * 같은 출력을 낸다 (MSG-427 승인 Q5). 미션 영역 타일을 **뷰포트 범위 안에서만** 펼치는
 * 클리핑(F-12)의 근거 함수다.
 */
const WEB_GRID_PATH = new URL(
  "../../../../../web/src/entities/cell/model/grid.ts",
  import.meta.url,
).pathname;

interface WebGrid {
  viewportGridRange: typeof viewportGridRange;
}

const loadWebGrid = (): Promise<WebGrid> => import(WEB_GRID_PATH);

/** 뷰포트 표본 — 서면 근접 뷰 · 부산 광역 뷰 · 아주 좁은 뷰 */
const BOUNDS_SAMPLES: Bounds[] = [
  { sw: { lat: 35.15, lng: 129.05 }, ne: { lat: 35.165, lng: 129.07 } },
  { sw: { lat: 35.05, lng: 128.9 }, ne: { lat: 35.3, lng: 129.3 } },
  { sw: { lat: 35.1578, lng: 129.0594 }, ne: { lat: 35.1579, lng: 129.0595 } },
];

describe("viewportGridRange 웹 원본 동등성 (F-11)", () => {
  it("표본 전건에서 웹 원본과 같은 셀 인덱스 범위를 낸다", async () => {
    const web = await loadWebGrid();

    for (const bounds of BOUNDS_SAMPLES) {
      expect(viewportGridRange(bounds)).toEqual(web.viewportGridRange(bounds));
    }
  });

  it("범위는 양끝 포함이며 min ≤ max다", () => {
    for (const bounds of BOUNDS_SAMPLES) {
      const range = viewportGridRange(bounds);

      expect(range.minGridX).toBeLessThanOrEqual(range.maxGridX);
      expect(range.minGridY).toBeLessThanOrEqual(range.maxGridY);
    }
  });
});
