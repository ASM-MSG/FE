import { describe, expect, it } from "vitest";
import { canSaveProfile, locationStatusLabel } from "./profile-edit";

describe("canSaveProfile — 닉네임이 빈 값이면 저장 불가, 아니면 저장 가능 (AC 6)", () => {
  it("닉네임이 빈 문자열이면 false를 반환한다", () => {
    expect(canSaveProfile("")).toBe(false);
  });

  it("공백만 포함한 닉네임도 빈 값으로 간주해 false를 반환한다 (A3 — trim)", () => {
    expect(canSaveProfile("   ")).toBe(false);
    expect(canSaveProfile("\t\n")).toBe(false);
  });

  it("내용이 있는 닉네임이면 true를 반환한다", () => {
    expect(canSaveProfile("필맵퍼")).toBe(true);
  });

  it("앞뒤 공백이 있어도 내용이 있으면 true를 반환한다", () => {
    expect(canSaveProfile("  필맵퍼  ")).toBe(true);
  });
});

describe("locationStatusLabel — 토글 상태 문구 (AC 4)", () => {
  it("켜짐이면 '사용 중'을 반환한다", () => {
    expect(locationStatusLabel(true)).toBe("사용 중");
  });

  it("꺼짐이면 '사용 안 함'을 반환한다 (추정 A2 승인)", () => {
    expect(locationStatusLabel(false)).toBe("사용 안 함");
  });
});
