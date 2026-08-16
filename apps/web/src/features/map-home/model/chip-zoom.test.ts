import { describe, expect, it } from "vitest";
import { chipEntryZoom } from "./chip-zoom";
import { scaleLabelForZoom } from "./map-scale";

describe("chipEntryZoom — 칩 활성화 시 맞추는 줌 단 (AC 5)", () => {
  it("지역축제·팝업스토어는 축척 500m가 보이는 줌이다 (AC 5)", () => {
    expect(scaleLabelForZoom(chipEntryZoom("festival") as number)).toBe("500m");
    expect(scaleLabelForZoom(chipEntryZoom("popup") as number)).toBe("500m");
  });

  it("경로추천은 축척 1km가 보이는 줌이다 — 축제·팝업보다 한 단 넓다 (AC 5)", () => {
    expect(scaleLabelForZoom(chipEntryZoom("route") as number)).toBe("1km");
    expect(chipEntryZoom("route")).toBeLessThan(
      chipEntryZoom("popup") as number,
    );
  });

  it("핫구역은 줌을 바꾸지 않는다 (AC 5)", () => {
    expect(chipEntryZoom("hot")).toBeNull();
  });
});
