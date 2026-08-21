import { describe, expect, it } from "vitest";
import {
  canSaveProfile,
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  nicknameError,
} from "./profile-edit";

/**
 * MSG-329 A7 재설계 — 구 검증(빈 값만 차단)은 1자를 통과시켜 서버 400을 불렀다.
 * 명세(PUT /api/users/me/nickname)와 같은 2~20자(trim 기준)로 강화한다.
 */
describe("닉네임 검증이 2~20자(trim 기준)다 (A7)", () => {
  it("1자는 저장 불가다 — 구 검증(빈 값만 차단)이 통과시키던 케이스", () => {
    expect(canSaveProfile("한")).toBe(false);
  });

  it("21자는 저장 불가다", () => {
    expect(canSaveProfile("가".repeat(21))).toBe(false);
  });

  it("2자·20자(경계)는 저장 가능하다", () => {
    expect(canSaveProfile("필맵")).toBe(true);
    expect(canSaveProfile("가".repeat(20))).toBe(true);
  });

  it("빈 문자열·공백만 있는 값은 저장 불가다", () => {
    expect(canSaveProfile("")).toBe(false);
    expect(canSaveProfile("   ")).toBe(false);
    expect(canSaveProfile("\t\n")).toBe(false);
  });

  it("trim 기준으로 판정한다 — 앞뒤 공백을 뺀 길이가 범위 판정 대상이다", () => {
    expect(canSaveProfile("  한  ")).toBe(false); // trim 후 1자
    expect(canSaveProfile("  필맵  ")).toBe(true); // trim 후 2자
    expect(canSaveProfile(`  ${"가".repeat(20)}  `)).toBe(true); // trim 후 20자
  });

  it("범위 밖이면 사유 안내 문구를, 유효하면 null을 반환한다 — [저장] 비활성 사유 표시용", () => {
    expect(nicknameError("한")).toBe(
      `닉네임은 ${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자로 입력해주세요`,
    );
    expect(nicknameError("가".repeat(21))).toBe(
      `닉네임은 ${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자로 입력해주세요`,
    );
    expect(nicknameError("필맵퍼")).toBeNull();
  });

  it("경계 상수는 명세값(2·20)이다", () => {
    expect(NICKNAME_MIN_LENGTH).toBe(2);
    expect(NICKNAME_MAX_LENGTH).toBe(20);
  });
});

// 구 locationStatusLabel(토글 상태 문구, A6) 케이스는 MSG-407 v3 결정 1(토글 접점
// 제거)로 함수와 함께 삭제 — 사유는 빌드 리포트 v3 절 참조
