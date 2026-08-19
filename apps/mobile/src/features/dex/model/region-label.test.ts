import { describe, expect, it } from "vitest";
import { formatProgressRate, shortRegionName } from "./region-label";

/**
 * L9: `shortRegionName("부산광역시 부산진구 부전2동") === "부전2동"`,
 * 공백 없는 값은 원문을 그대로 돌려준다. 묶음 키는 원문이 계속 담당하고
 * 표시만 마지막 토큰으로 줄인다 (웹 MSG-327 기준 6 포팅).
 */
describe("shortRegionName — 전체 경로 행정동명 축약 (L9)", () => {
  it("전체 경로에서 마지막 토큰(행정동)만 남긴다 (L9)", () => {
    expect(shortRegionName("부산광역시 부산진구 부전2동")).toBe("부전2동");
  });

  it("공백 없는 값은 원문을 그대로 돌려준다 (L9)", () => {
    expect(shortRegionName("부전2동")).toBe("부전2동");
  });

  it("빈 문자열은 빈 문자열이다 (L9 경계)", () => {
    expect(shortRegionName("")).toBe("");
  });
});

/**
 * L8: `formatProgressRate(6.85) === "6.9%"`, `formatProgressRate(7) === "7%"`.
 * 소수 첫째 자리까지, 정수면 정수 (승인 Q4 — 웹 parity 유지, Figma의 `52%`는
 * 우연히 정수인 샘플값이라 정수 표기로 내리지 않는다).
 */
describe("formatProgressRate — 탐험률 퍼센트 표기 (L8)", () => {
  it("소수 둘째 자리 값은 첫째 자리로 반올림된다 (L8)", () => {
    expect(formatProgressRate(6.85)).toBe("6.9%");
  });

  it("정수 값은 소수점 없이 표기된다 (L8)", () => {
    expect(formatProgressRate(7)).toBe("7%");
    expect(formatProgressRate(0)).toBe("0%");
    expect(formatProgressRate(100)).toBe("100%");
  });
});
