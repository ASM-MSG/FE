import { describe, expect, it } from "vitest";
import { isForwardNavigation, shouldShowConsentGate } from "./location-consent";

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

describe("isForwardNavigation — 게이트 popstate 방향 판별 (v4 codex P1, PR 리뷰 추출)", () => {
  it("idx가 마지막 관찰값보다 크면 앞으로가기다 — 게이트 유지·로그인 중단 없음", () => {
    expect(isForwardNavigation(6, 5)).toBe(true);
  });

  it("idx가 마지막 관찰값보다 작으면 앞으로가기가 아니다 — 뒤로가기(로그인 중단)", () => {
    expect(isForwardNavigation(4, 5)).toBe(false);
  });

  it("idx가 같으면 앞으로가기가 아니다 — 같은 엔트리 재발화도 뒤로가기 취급", () => {
    expect(isForwardNavigation(5, 5)).toBe(false);
  });

  it("마지막 관찰값 미상(초기 관찰 전)이면 앞으로가기로 판정하지 않는다 — 미상은 뒤로가기 간주(이탈 수단 보존)", () => {
    expect(isForwardNavigation(6, undefined)).toBe(false);
  });

  it("idx 미상(라우터 밖 히스토리 엔트리)이면 앞으로가기로 판정하지 않는다 — 뒤로가기 간주", () => {
    expect(isForwardNavigation(undefined, 5)).toBe(false);
  });

  it("둘 다 미상이어도 뒤로가기 간주다", () => {
    expect(isForwardNavigation(undefined, undefined)).toBe(false);
  });
});
