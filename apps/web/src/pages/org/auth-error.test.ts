import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/api-error";
import {
  authErrorMessage,
  isPasswordAlreadySetError,
  NETWORK_ERROR_MESSAGE,
} from "./auth-error";

describe("authErrorMessage — 콘솔 인증 폼 오류 문구 (AC 3)", () => {
  it("HTTP 오류 봉투는 서버 message를 그대로 안내한다 (AC 3)", () => {
    const error = new ApiError("이메일 또는 비밀번호가 올바르지 않습니다", {
      status: 401,
      developCode: 1002,
    });

    expect(authErrorMessage(error)).toBe(
      "이메일 또는 비밀번호가 올바르지 않습니다",
    );
  });

  it("status가 없는 실패는 네트워크 오류 문구로 수렴한다 (AC 3)", () => {
    expect(authErrorMessage(new ApiError("Failed to fetch"))).toBe(
      NETWORK_ERROR_MESSAGE,
    );
  });

  it("ApiError가 아닌 예외도 네트워크 오류 문구로 수렴한다 — 경계 (AC 3)", () => {
    expect(authErrorMessage(new TypeError("Network request failed"))).toBe(
      NETWORK_ERROR_MESSAGE,
    );
  });

  it("서버 message가 비어 있으면 네트워크 문구가 아니라 일반 실패 문구를 쓴다 (AC 3)", () => {
    expect(authErrorMessage(new ApiError("", { status: 500 }))).not.toBe("");
  });
});

describe("isPasswordAlreadySetError — 이미 설정 완료 판별 (AC 8)", () => {
  it("developCode 2446은 이미 설정 완료로 판별된다 (AC 8)", () => {
    expect(
      isPasswordAlreadySetError(
        new ApiError("이미 비밀번호를 설정했습니다", {
          status: 400,
          developCode: 2446,
        }),
      ),
    ).toBe(true);
  });

  it("다른 developCode는 이미 설정 완료가 아니다 — 일반 오류 안내로 수렴 (AC 8·추정 9)", () => {
    expect(
      isPasswordAlreadySetError(
        new ApiError("소셜 계정입니다", { status: 400, developCode: 2445 }),
      ),
    ).toBe(false);
  });

  it("ApiError가 아닌 예외는 이미 설정 완료가 아니다 — 경계 (AC 8)", () => {
    expect(isPasswordAlreadySetError(new TypeError("boom"))).toBe(false);
  });
});
