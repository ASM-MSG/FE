import { describe, expect, it } from "vitest";
import { selectRegions } from "../../../entities/region/model/regions";
import { matchRegion } from "./match-region";

/**
 * AC 11 / D-Q1: 검색어 → 구 매칭 판정 — 일치 시 지도 이동 대상 Region 반환,
 * 불일치·빈 검색어는 null(기록만 갱신하고 검색 화면 유지).
 * 매칭 의미론은 웹 explore-cells searchCells와 동일: trim 후 부분 문자열 포함.
 */
describe("matchRegion (AC 11, D-Q1)", () => {
  const regions = selectRegions();

  it("검색어가 구 이름과 정확히 일치하면 해당 Region을 반환한다 — 지도 이동+홈 복귀 대상", () => {
    const matched = matchRegion(regions, "부산진구");
    expect(matched?.name).toBe("부산진구");
    expect(matched?.center).toBeDefined();
  });

  it("구 이름의 부분 문자열도 매칭한다 — 웹 explore-cells 부분 일치 의미론", () => {
    expect(matchRegion(regions, "부산진")?.name).toBe("부산진구");
    expect(matchRegion(regions, "해운대")?.name).toBe("해운대구");
  });

  it("앞뒤 공백은 trim 후 매칭한다", () => {
    expect(matchRegion(regions, "  수영구  ")?.name).toBe("수영구");
  });

  it("어느 구와도 일치하지 않으면 null — 기록만 갱신하고 화면 유지 대상", () => {
    expect(matchRegion(regions, "서면 카페")).toBeNull();
    expect(matchRegion(regions, "홍대입구")).toBeNull();
  });

  it("빈·공백 검색어는 null을 반환한다", () => {
    expect(matchRegion(regions, "")).toBeNull();
    expect(matchRegion(regions, "   ")).toBeNull();
  });

  it("여러 구에 걸리는 모호한 검색어는 null — 첫 매칭으로 튕기지 않는다 (PR #37 리뷰)", () => {
    // "구"는 부산 8개 구 이름 전부에 포함 — 자동 이동은 유일 매칭일 때만
    expect(matchRegion(regions, "구")).toBeNull();
  });

  it("1자 검색어는 유일 매칭이라도 null — 미완성 입력의 자동 이동 방지", () => {
    // "부"는 부산진구에만 포함되지만 한 글자로는 목적지를 확정하지 않는다
    expect(matchRegion(regions, "부")).toBeNull();
  });
});
