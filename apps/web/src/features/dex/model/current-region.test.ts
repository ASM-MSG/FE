import { describe, expect, it } from "vitest";
import { DEFAULT_REGION_NAME, resolveCurrentRegion } from "./current-region";

// 디폴트 지역 "부산진구"는 이제 REGIONS 키에 포함된다 — 별도 디폴트 키 없음 (A13)
const REGION_PCT_MAP = { 부산진구: 52, 수영구: 34 };

describe("resolveCurrentRegion — 지역명·지역 탐험률 결정 (AC 21, 개정 D2)", () => {
  it("역지오코딩 성공 시 해당 구 이름과 맵의 탐험률을 반환한다", () => {
    expect(resolveCurrentRegion("부산진구", REGION_PCT_MAP)).toEqual({
      name: "부산진구",
      pct: 52,
    });
  });

  it("역지오코딩 실패·services 미가용(null) 시 디폴트 '부산진구' 기준으로 반환한다 (A13)", () => {
    expect(resolveCurrentRegion(null, REGION_PCT_MAP)).toEqual({
      name: "부산진구",
      pct: 52,
    });
  });

  it("지역별 탐험률 맵에 없는 지역은 0%다", () => {
    expect(resolveCurrentRegion("금정구", REGION_PCT_MAP)).toEqual({
      name: "금정구",
      pct: 0,
    });
  });

  it("맵의 탐험률도 0~100으로 클램프한다 (AC 7)", () => {
    expect(resolveCurrentRegion("부산진구", { 부산진구: 150 }).pct).toBe(100);
    expect(resolveCurrentRegion("부산진구", { 부산진구: -3 }).pct).toBe(0);
  });

  it("디폴트 지역 상수는 서면 소재지 '부산진구'다 (A13 — SEOMYEON_CENTER 폴백과 정합)", () => {
    expect(DEFAULT_REGION_NAME).toBe("부산진구");
  });
});
