import { describe, expect, it } from "vitest";
import { shouldShowConsentGate } from "./location-consent";

describe("shouldShowConsentGate — 위치정보 동의 게이트 판정 (MSG-407)", () => {
  it("로그인 + getMe 성공 + locationConsent=false면 게이트를 띄운다 (기준 1)", () => {
    expect(
      shouldShowConsentGate({
        isAuthenticated: true,
        consentKnown: true,
        locationConsent: false,
      }),
    ).toBe(true);
  });

  it("locationConsent=true면 게이트가 나타나지 않는다 (기준 2)", () => {
    expect(
      shouldShowConsentGate({
        isAuthenticated: true,
        consentKnown: true,
        locationConsent: true,
      }),
    ).toBe(false);
  });

  it("비로그인 상태에서는 게이트가 나타나지 않는다 (기준 3)", () => {
    expect(
      shouldShowConsentGate({
        isAuthenticated: false,
        consentKnown: false,
        locationConsent: undefined,
      }),
    ).toBe(false);
  });

  it("getMe 로딩·실패 중(동의 여부 미확인)에는 게이트를 띄우지 않는다 — 서버 오류로 앱 전체가 잠기지 않게 (추정 4)", () => {
    expect(
      shouldShowConsentGate({
        isAuthenticated: true,
        consentKnown: false,
        locationConsent: undefined,
      }),
    ).toBe(false);
  });
});
