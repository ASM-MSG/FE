import { describe, expect, it } from "vitest";
import { shouldShowConsentGate } from "./consent-gate";

/**
 * AC 1·2·3: 회원가입 약관 동의 게이트 판정 — 웹 MSG-407 원본과 동등 (parity).
 * 웹 원본은 `features/profile/model/location-consent.ts`이고 모바일은 유일 소비처가
 * 회원가입 게이트라 `features/auth/model`에 둔다(승인 Q4) — 배치가 달라도 동등성은
 * 웹 원본 동적 import로 고정한다 (format·profile-edit parity 선례).
 * `isForwardNavigation`은 RN에 대응 개념이 없어 포팅 대상이 아니다(승인 Q3).
 */
interface WebLocationConsentModule {
  shouldShowConsentGate: typeof shouldShowConsentGate;
}
const WEB_LOCATION_CONSENT_PATH = new URL(
  "../../../../../web/src/features/profile/model/location-consent.ts",
  import.meta.url,
).pathname;
const loadWebLocationConsent = (): Promise<WebLocationConsentModule> =>
  import(WEB_LOCATION_CONSENT_PATH);

/** 판정 입력의 전 조합 (2 × 2 × 3) */
const ALL_INPUTS = [true, false].flatMap((isAuthenticated) =>
  [true, false].flatMap((consentKnown) =>
    [true, false, undefined].map((locationConsent) => ({
      isAuthenticated,
      consentKnown,
      locationConsent,
    })),
  ),
);

describe("shouldShowConsentGate 동등성 (AC 1·2·3)", () => {
  it("인증됨 ∧ 조회 성공 ∧ locationConsent === false 세 조건이 모두 참일 때만 게이트가 표시된다 (AC 1)", () => {
    expect(
      shouldShowConsentGate({
        isAuthenticated: true,
        consentKnown: true,
        locationConsent: false,
      }),
    ).toBe(true);
    expect(
      shouldShowConsentGate({
        isAuthenticated: true,
        consentKnown: true,
        locationConsent: true,
      }),
    ).toBe(false);
  });

  it("조회 전·실패(consentKnown=false)에는 게이트가 표시되지 않는다 — 앱 전체 잠김 방지 (AC 2)", () => {
    expect(
      shouldShowConsentGate({
        isAuthenticated: true,
        consentKnown: false,
        locationConsent: undefined,
      }),
    ).toBe(false);
    // 실패 직전 캐시가 남아 false가 보여도 조회 성공이 아니면 띄우지 않는다
    expect(
      shouldShowConsentGate({
        isAuthenticated: true,
        consentKnown: false,
        locationConsent: false,
      }),
    ).toBe(false);
  });

  it("비로그인 상태에서는 어떤 조회 결과에도 게이트가 표시되지 않는다 (AC 3)", () => {
    expect(
      shouldShowConsentGate({
        isAuthenticated: false,
        consentKnown: true,
        locationConsent: false,
      }),
    ).toBe(false);
  });

  it("입력 전 조합(2×2×3)에서 웹 shouldShowConsentGate와 판정이 동일하다 (AC 1)", async () => {
    const web = await loadWebLocationConsent();

    for (const input of ALL_INPUTS) {
      expect(shouldShowConsentGate(input)).toBe(
        web.shouldShowConsentGate(input),
      );
    }
  });
});
