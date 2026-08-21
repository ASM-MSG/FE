import { describe, expect, it } from "vitest";

import {
  KAKAO_MISSING_ID_TOKEN,
  KAKAO_NOT_CONFIGURED,
  kakaoLoginNotice,
  resolveKakaoLoginReason,
  type KakaoLoginReason,
} from "./kakao-login-failure";

/**
 * 템플릿 ① 순수 로직 — 카카오 로그인 실패 판정·안내 문구 (기준 1·3).
 * 네이티브 SDK 거절은 `Error.code`(카카오 SDK의 reason 이름)로, 서버 거절은
 * `ApiError.developCode`로 온다 — 두 축을 한 판정 함수가 흡수하는지 고정한다.
 */

/** 네이티브 SDK 거절 모사 — RN 브릿지는 reason 이름을 `code`로 실어 보낸다 */
const sdkError = (code: string): Error =>
  Object.assign(new Error(`kakao sdk: ${code}`), { code });

/** 서버 거절 모사 — 정규화된 ApiError의 관찰 지점은 developCode 하나다 */
const serverError = (developCode: number): Error =>
  Object.assign(new Error("서버 거절"), { developCode });

describe("resolveKakaoLoginReason (기준 1)", () => {
  it("카카오톡 화면에서 뒤로 나온 경우(Cancelled)는 사용자 취소로 판정한다", () => {
    expect(resolveKakaoLoginReason(sdkError("Cancelled"))).toBe("cancelled");
  });

  it("카카오계정 동의 화면에서 거절한 경우(AccessDenied)도 사용자 취소로 판정한다", () => {
    expect(resolveKakaoLoginReason(sdkError("AccessDenied"))).toBe("cancelled");
  });

  it("설정 오류(Misconfigured)는 취소가 아니다 — 재시도로 풀리지 않으므로 알려야 한다", () => {
    expect(resolveKakaoLoginReason(sdkError("Misconfigured"))).toBe(
      "misconfigured",
    );
  });

  it("네이티브 앱 키 미설정·ID 토큰 미발급은 설정 오류로 모은다", () => {
    expect(resolveKakaoLoginReason(sdkError(KAKAO_NOT_CONFIGURED))).toBe(
      "misconfigured",
    );
    expect(resolveKakaoLoginReason(sdkError(KAKAO_MISSING_ID_TOKEN))).toBe(
      "misconfigured",
    );
  });

  it("SDK의 알 수 없는 거절(Unknown)은 취소가 아니라 unknown이다", () => {
    expect(resolveKakaoLoginReason(sdkError("Unknown"))).toBe("unknown");
  });

  it("서버가 소셜 토큰을 거절하면(2421) 설정 오류다 — 재시도로 풀리지 않는다 (실기 환류)", () => {
    // 2026-08-21 실기: 카카오 로그인·ID 토큰 발급은 성공했는데 서버가 401 `2421`로 거절했다
    // (토큰 `aud`는 네이티브 앱 키, 서버 검증 기준은 REST API 키). 이때 "다시 시도해 주세요"는
    // 사용자를 무의미한 재시도로 몰아넣는다 — 설정 축으로 보내 안내 문구를 바꾼다.
    expect(resolveKakaoLoginReason(serverError(2421))).toBe("misconfigured");
  });

  it("서버 거절은 developCode로 갈린다 — 2423 만료 / 2502 제공자 장애 / 그 외 unknown", () => {
    expect(resolveKakaoLoginReason(serverError(2423))).toBe("expired");
    expect(resolveKakaoLoginReason(serverError(2502))).toBe("provider");
    expect(resolveKakaoLoginReason(serverError(9999))).toBe("unknown");
  });

  it("코드가 없는 에러·에러가 아닌 값도 unknown으로 떨어져 판정이 비지 않는다", () => {
    expect(resolveKakaoLoginReason(new Error("네트워크 실패"))).toBe("unknown");
    expect(resolveKakaoLoginReason(undefined)).toBe("unknown");
  });
});

describe("kakaoLoginNotice (기준 3)", () => {
  it("사용자 취소는 안내하지 않는다 — 스스로 그만둔 것을 오류로 보이면 안 된다", () => {
    expect(kakaoLoginNotice("cancelled")).toBeNull();
  });

  it("취소를 제외한 4종은 모두 서로 다른 안내 문구를 갖는다 — 빠진 사유가 없다", () => {
    const reasons: KakaoLoginReason[] = [
      "misconfigured",
      "expired",
      "provider",
      "unknown",
    ];
    const notices = reasons.map((reason) => kakaoLoginNotice(reason));

    expect(
      notices.every((notice) => notice !== null && notice.length > 0),
    ).toBe(true);
    expect(new Set(notices).size).toBe(reasons.length);
  });
});
