import { describe, expect, it } from "vitest";
import { parsePositiveIntParam } from "./route-param";

/**
 * 경로 파라미터 판정 정본 (MSG-553 codex 1R·3R — 복제 2벌 통합).
 * 두 소비처(`features/admin-review`·`features/org-submissions`)의 계약이 여기 모인다.
 */
describe("parsePositiveIntParam", () => {
  it("양의 정수 문자열을 숫자로 준다", () => {
    expect(parsePositiveIntParam("1204")).toBe(1204);
    expect(parsePositiveIntParam("1")).toBe(1);
  });

  it("비숫자·빈 값·undefined·음수·소수·공백 혼입은 null이다", () => {
    expect(parsePositiveIntParam("abc")).toBeNull();
    expect(parsePositiveIntParam("")).toBeNull();
    expect(parsePositiveIntParam(undefined)).toBeNull();
    expect(parsePositiveIntParam("-3")).toBeNull();
    expect(parsePositiveIntParam("12.5")).toBeNull();
    expect(parsePositiveIntParam("12a")).toBeNull();
    expect(parsePositiveIntParam(" 3 ")).toBeNull();
  });

  it("0은 null이다 — 서버 id는 1부터다", () => {
    expect(parsePositiveIntParam("0")).toBeNull();
    expect(parsePositiveIntParam("00")).toBeNull();
  });

  it("안전 정수를 넘는 숫자열은 null이다 — 반올림된 다른 id로 조회가 나가지 않는다", () => {
    expect(parsePositiveIntParam("9007199254740993")).toBeNull();
    expect(parsePositiveIntParam("9".repeat(400))).toBeNull();
    expect(parsePositiveIntParam("9007199254740991")).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });
});
