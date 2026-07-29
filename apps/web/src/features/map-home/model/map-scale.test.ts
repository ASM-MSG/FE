import { describe, expect, it } from "vitest";
import { scaleLabelForZoom } from "./map-scale";

describe("scaleLabelForZoom", () => {
  it("네이버 zoom별 축척 표기를 반환한다 (AC 5, A3 — 기존 카카오 표 역순 재배치 + 2단 확장)", () => {
    // zoom ≈ 20 − 카카오 level (A1) — 기존 라벨 재사용 구간
    expect(scaleLabelForZoom(6)).toBe("128km");
    expect(scaleLabelForZoom(8)).toBe("32km");
    expect(scaleLabelForZoom(12)).toBe("2km");
    expect(scaleLabelForZoom(13)).toBe("1km");
    expect(scaleLabelForZoom(15)).toBe("250m"); // 초기 줌(A1: 기존 level 5 등가)
    expect(scaleLabelForZoom(19)).toBe("20m");
    // 카카오에 없던 신규 2단 (A3)
    expect(scaleLabelForZoom(20)).toBe("10m");
    expect(scaleLabelForZoom(21)).toBe("5m");
  });

  it("유효 범위(6~21) 밖 zoom은 경계 값으로 클램프한다", () => {
    expect(scaleLabelForZoom(5)).toBe("128km");
    expect(scaleLabelForZoom(0)).toBe("128km");
    expect(scaleLabelForZoom(-3)).toBe("128km");
    expect(scaleLabelForZoom(99)).toBe("5m");
  });

  it("비정수 zoom은 내림해 해석한다", () => {
    expect(scaleLabelForZoom(15.7)).toBe("250m");
  });

  it("NaN·Infinity 등 비정상 값은 경계 축척으로 폴백한다 (undefined 렌더 방어)", () => {
    expect(scaleLabelForZoom(Number.NaN)).toBe("128km");
    expect(scaleLabelForZoom(Number.POSITIVE_INFINITY)).toBe("5m");
    expect(scaleLabelForZoom(Number.NEGATIVE_INFINITY)).toBe("128km");
  });
});
