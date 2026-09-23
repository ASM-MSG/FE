import { describe, expect, it } from "vitest";

import {
  APPLE_UNAVAILABLE,
  KAKAO_NOT_CONFIGURED,
  MISSING_ID_TOKEN,
  resolveSocialLoginReason,
  socialLoginNotice,
  type SocialLoginReason,
} from "./social-login-failure";

/**
 * 템플릿 ① 순수 로직 — 소셜 로그인 실패 판정·안내 문구 (MSG-444 기준 1·3 → MSG-601 L6·L7).
 * 네이티브 SDK 거절은 `Error.code`(카카오 SDK reason 이름 / 애플 `ERR_REQUEST_*`)로, 서버 거절은
 * `ApiError.developCode`로 온다 — 두 축을 한 판정 함수가 흡수하는지 고정한다.
 * 카카오 판정·문구는 MSG-444 그대로다(불변 단정) — 애플은 코드 2종과 라벨만 더한다.
 */

/** 네이티브 SDK 거절 모사 — RN 브릿지는 reason 이름을 `code`로 실어 보낸다 */
const sdkError = (code: string): Error =>
  Object.assign(new Error(`sdk: ${code}`), { code });

/** 서버 거절 모사 — 정규화된 ApiError의 관찰 지점은 developCode 하나다 */
const serverError = (developCode: number): Error =>
  Object.assign(new Error("서버 거절"), { developCode });

describe("resolveSocialLoginReason (MSG-444 기준 1)", () => {
  it("카카오톡 화면에서 뒤로 나온 경우(Cancelled)는 사용자 취소로 판정한다", () => {
    expect(resolveSocialLoginReason(sdkError("Cancelled"))).toBe("cancelled");
  });

  it("카카오계정 동의 화면에서 거절한 경우(AccessDenied)도 사용자 취소로 판정한다", () => {
    expect(resolveSocialLoginReason(sdkError("AccessDenied"))).toBe(
      "cancelled",
    );
  });

  it("설정 오류(Misconfigured)는 취소가 아니다 — 재시도로 풀리지 않으므로 알려야 한다", () => {
    expect(resolveSocialLoginReason(sdkError("Misconfigured"))).toBe(
      "misconfigured",
    );
  });

  it("네이티브 앱 키 미설정·ID 토큰 미발급은 설정 오류로 모은다", () => {
    expect(resolveSocialLoginReason(sdkError(KAKAO_NOT_CONFIGURED))).toBe(
      "misconfigured",
    );
    expect(resolveSocialLoginReason(sdkError(MISSING_ID_TOKEN))).toBe(
      "misconfigured",
    );
  });

  it("SDK의 알 수 없는 거절(Unknown)은 취소가 아니라 unknown이다", () => {
    expect(resolveSocialLoginReason(sdkError("Unknown"))).toBe("unknown");
  });

  it("서버가 소셜 토큰을 거절하면(2421) 설정 오류다 — 재시도로 풀리지 않는다 (실기 환류)", () => {
    // 2026-08-21 실기: 카카오 로그인·ID 토큰 발급은 성공했는데 서버가 401 `2421`로 거절했다
    // (토큰 `aud`는 네이티브 앱 키, 서버 검증 기준은 REST API 키). 이때 "다시 시도해 주세요"는
    // 사용자를 무의미한 재시도로 몰아넣는다 — 설정 축으로 보내 안내 문구를 바꾼다.
    expect(resolveSocialLoginReason(serverError(2421))).toBe("misconfigured");
  });

  it("서버 거절은 developCode로 갈린다 — 2423 만료 / 2502 제공자 장애 / 그 외 unknown", () => {
    expect(resolveSocialLoginReason(serverError(2423))).toBe("expired");
    expect(resolveSocialLoginReason(serverError(2502))).toBe("provider");
    expect(resolveSocialLoginReason(serverError(9999))).toBe("unknown");
  });

  it("코드가 없는 에러·에러가 아닌 값도 unknown으로 떨어져 판정이 비지 않는다", () => {
    expect(resolveSocialLoginReason(new Error("네트워크 실패"))).toBe(
      "unknown",
    );
    expect(resolveSocialLoginReason(undefined)).toBe("unknown");
  });
});

describe("resolveSocialLoginReason — 애플 (MSG-601 L6·L7)", () => {
  it("애플 시트에서 취소(ERR_REQUEST_CANCELED)하면 사용자 취소로 판정하고 안내 문구는 없다 (L6)", () => {
    const reason = resolveSocialLoginReason(sdkError("ERR_REQUEST_CANCELED"));

    expect(reason).toBe("cancelled");
    expect(socialLoginNotice(reason, "apple")).toBeNull();
  });

  it("iOS가 아닌 플랫폼에서의 호출(AppleUnavailable)은 설정 오류다 (A8)", () => {
    expect(resolveSocialLoginReason(sdkError(APPLE_UNAVAILABLE))).toBe(
      "misconfigured",
    );
  });

  it("애플의 그 외 실패 코드(ERR_REQUEST_UNKNOWN·ERR_REQUEST_FAILED)는 unknown이다 (A8)", () => {
    expect(resolveSocialLoginReason(sdkError("ERR_REQUEST_UNKNOWN"))).toBe(
      "unknown",
    );
    expect(resolveSocialLoginReason(sdkError("ERR_REQUEST_FAILED"))).toBe(
      "unknown",
    );
  });

  it("서버 developCode 판정은 provider와 무관하다 — 2421 설정 / 2423 만료 / 2502 제공자 / 그 외 unknown (L7)", () => {
    // 판정 함수는 provider를 받지 않는다: 애플 로그인의 서버 거절도 같은 코드 체계다
    expect(resolveSocialLoginReason(serverError(2421))).toBe("misconfigured");
    expect(resolveSocialLoginReason(serverError(2423))).toBe("expired");
    expect(resolveSocialLoginReason(serverError(2502))).toBe("provider");
    expect(resolveSocialLoginReason(serverError(1))).toBe("unknown");
  });
});

describe("socialLoginNotice (MSG-444 기준 3 → MSG-601 L7)", () => {
  it("사용자 취소는 안내하지 않는다 — 스스로 그만둔 것을 오류로 보이면 안 된다", () => {
    expect(socialLoginNotice("cancelled", "kakao")).toBeNull();
    expect(socialLoginNotice("cancelled", "apple")).toBeNull();
  });

  it("카카오 문구 4종은 MSG-444 문자열 그대로다 (불변)", () => {
    expect(socialLoginNotice("misconfigured", "kakao")).toBe(
      "카카오 로그인 설정에 문제가 있어요. 문제가 계속되면 문의해 주세요.",
    );
    expect(socialLoginNotice("expired", "kakao")).toBe(
      "로그인 요청이 만료됐어요. 다시 시도해 주세요.",
    );
    expect(socialLoginNotice("provider", "kakao")).toBe(
      "카카오 서버가 불안정해요. 잠시 후 다시 시도해 주세요.",
    );
    expect(socialLoginNotice("unknown", "kakao")).toBe(
      "로그인에 실패했어요. 다시 시도해 주세요.",
    );
  });

  it("애플 문구는 provider 라벨만 다르다 — 설정·제공자 장애 2종에 'Apple', 나머지는 공통 문구 (L7)", () => {
    expect(socialLoginNotice("misconfigured", "apple")).toBe(
      "Apple 로그인 설정에 문제가 있어요. 문제가 계속되면 문의해 주세요.",
    );
    expect(socialLoginNotice("provider", "apple")).toBe(
      "Apple 서버가 불안정해요. 잠시 후 다시 시도해 주세요.",
    );
    expect(socialLoginNotice("expired", "apple")).toBe(
      socialLoginNotice("expired", "kakao"),
    );
    expect(socialLoginNotice("unknown", "apple")).toBe(
      socialLoginNotice("unknown", "kakao"),
    );
  });

  it("취소를 제외한 4종은 provider마다 서로 다른 안내 문구를 갖는다 — 빠진 사유가 없다", () => {
    const reasons: SocialLoginReason[] = [
      "misconfigured",
      "expired",
      "provider",
      "unknown",
    ];
    for (const provider of ["kakao", "apple"] as const) {
      const notices = reasons.map((reason) =>
        socialLoginNotice(reason, provider),
      );

      expect(
        notices.every((notice) => notice !== null && notice.length > 0),
      ).toBe(true);
      expect(new Set(notices).size).toBe(reasons.length);
    }
  });
});
