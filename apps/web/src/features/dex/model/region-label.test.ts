import { describe, expect, it } from "vitest";
import { formatProgressRate, shortRegionName } from "./region-label";

describe("shortRegionName — 행정동 표시명 축약 (기준 6, 실데이터 보정)", () => {
  it("서버가 주는 전체 경로에서 행정동 이름만 남긴다", () => {
    expect(shortRegionName("부산광역시 부산진구 부전2동")).toBe("부전2동");
  });

  it("이미 행정동 이름만 오면 그대로 둔다 (경계)", () => {
    expect(shortRegionName("전포동")).toBe("전포동");
  });

  it("빈 문자열은 그대로 둔다 — 축약이 이름을 지우지 않는다 (경계)", () => {
    expect(shortRegionName("")).toBe("");
  });
});

describe("formatProgressRate — 수집률 표시 (기준 4, 실데이터 보정)", () => {
  it("소수 수집률은 첫째 자리까지만 보여준다", () => {
    expect(formatProgressRate(6.85)).toBe("6.9%");
  });

  it("정수 수집률은 소수점 없이 보여준다", () => {
    expect(formatProgressRate(52)).toBe("52%");
  });

  it("0은 0%다 (경계)", () => {
    expect(formatProgressRate(0)).toBe("0%");
  });
});
