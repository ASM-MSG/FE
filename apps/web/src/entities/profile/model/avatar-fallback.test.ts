import { describe, expect, it } from "vitest";
import { avatarFallback } from "./avatar-fallback";

describe("avatarFallback — 닉네임 첫 글자 아바타 fallback (MSG-125 리뷰 반영 — ProfileHeader·ProfileEditModal 공용)", () => {
  it("닉네임의 첫 글자만 반환한다", () => {
    expect(avatarFallback("필맵퍼")).toBe("필");
    expect(avatarFallback("Aa")).toBe("A");
  });

  it("한 글자 닉네임은 그대로 반환한다", () => {
    expect(avatarFallback("맵")).toBe("맵");
  });

  it("빈 문자열이면 빈 문자열을 반환한다 (기존 slice(0, 1) 동작 유지)", () => {
    expect(avatarFallback("")).toBe("");
  });
});
