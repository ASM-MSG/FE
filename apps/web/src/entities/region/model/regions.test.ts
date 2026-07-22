import { describe, expect, it } from "vitest";
import { MOCK_RECENT_VISITS, selectRegions } from "./regions";

describe("selectRegions 전체 지역 셀렉터 (AC 15)", () => {
  it("각 구를 격자 수(count)와 함께 반환한다", () => {
    for (const region of selectRegions()) {
      expect(typeof region.name).toBe("string");
      expect(region.name.length).toBeGreaterThan(0);
      expect(typeof region.count).toBe("number");
      expect(region.count).toBeGreaterThan(0);
    }
  });

  it("Figma 목업 순서 그대로 8개 구를 반환한다", () => {
    expect(selectRegions().map((r) => r.name)).toEqual([
      "부산진구",
      "해운대구",
      "수영구",
      "남구",
      "연제구",
      "동래구",
      "사상구",
      "동구",
    ]);
  });
});

describe("MOCK_RECENT_VISITS 최근 방문 목데이터 (AC 2)", () => {
  it("최근 방문 지역은 부산진구·수영구·남구다", () => {
    expect(MOCK_RECENT_VISITS).toEqual(["부산진구", "수영구", "남구"]);
  });

  it("최근 방문 지역은 전체 지역 목록에 존재하는 구다", () => {
    const names = new Set(selectRegions().map((r) => r.name));
    for (const visit of MOCK_RECENT_VISITS) {
      expect(names.has(visit)).toBe(true);
    }
  });
});
