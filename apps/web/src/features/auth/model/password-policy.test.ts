import { describe, expect, it } from "vitest";
import {
  newPasswordError,
  PASSWORD_RULE_HINT,
  validateNewPassword,
} from "./password-policy";

describe("validateNewPassword — 서버 비밀번호 정책 판정 (AC 6)", () => {
  it("영문과 숫자를 각각 하나 이상 포함한 8자 이상이면 통과한다 (AC 6)", () => {
    const result = validateNewPassword("fillmap12");

    expect(result.isValid).toBe(true);
    expect(result.satisfiedCount).toBe(3);
  });

  it("8자 미만이면 길이 요건만 불충족이다 — 경계 (AC 6)", () => {
    const result = validateNewPassword("fill123");

    expect(result.isValid).toBe(false);
    expect(
      result.checks.filter((check) => !check.satisfied).map((c) => c.key),
    ).toEqual(["length"]);
  });

  it("64자를 넘으면 길이 요건이 불충족이다 — 경계 (AC 6)", () => {
    expect(validateNewPassword(`${"a".repeat(63)}1`).isValid).toBe(true);
    expect(validateNewPassword(`${"a".repeat(64)}1`).isValid).toBe(false);
  });

  it("숫자가 없으면 불충족이다 (AC 6)", () => {
    const result = validateNewPassword("fillmapfillmap");

    expect(result.isValid).toBe(false);
    expect(
      result.checks.find((check) => check.key === "digit")?.satisfied,
    ).toBe(false);
  });

  it("영문이 없으면 불충족이다 (AC 6)", () => {
    const result = validateNewPassword("12345678");

    expect(result.isValid).toBe(false);
    expect(
      result.checks.find((check) => check.key === "letter")?.satisfied,
    ).toBe(false);
  });

  it("빈 입력은 세 요건 전부 불충족이다 — 경계 (AC 6)", () => {
    const result = validateNewPassword("");

    expect(result.isValid).toBe(false);
    expect(result.satisfiedCount).toBe(0);
    expect(result.checks).toHaveLength(3);
  });
});

describe("newPasswordError — 제출 차단 사유 (AC 6)", () => {
  it("정책 미충족이면 규칙 문구를 사유로 돌려준다 (AC 6)", () => {
    expect(newPasswordError("short1", "short1")).toContain(PASSWORD_RULE_HINT);
  });

  it("확인 값이 다르면 불일치 사유를 돌려준다 (AC 6)", () => {
    expect(newPasswordError("fillmap12", "fillmap13")).toBe(
      "비밀번호 확인이 일치하지 않습니다",
    );
  });

  it("정책을 충족하고 확인 값이 같으면 사유가 없다 — 제출 허용 (AC 6)", () => {
    expect(newPasswordError("fillmap12", "fillmap12")).toBeNull();
  });

  it("정책 미충족과 불일치가 겹치면 정책 사유를 먼저 안내한다 (AC 6)", () => {
    expect(newPasswordError("short", "other")).toContain(PASSWORD_RULE_HINT);
  });
});
