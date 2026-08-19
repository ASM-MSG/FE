import { describe, expect, it } from "vitest";
import {
  CONSENT_ITEMS,
  INITIAL_CONSENT_STATE,
  canSubmitConsent,
  isAllAgreed,
  toggleAll,
  toggleItem,
} from "./signup-consent";

/**
 * AC 8·9·13~17: 회원가입 약관 동의 화면의 체크 상호작용·CTA 활성 파생.
 * RN 렌더 테스트 인프라가 없으므로(MSG-292 확정 4) 화면은 이 순수 함수를 호출하는
 * 얇은 층으로 두고, 상태 전이 계약을 전부 여기서 고정한다.
 */

/** 필수 4개만 체크된 상태 (마케팅 미체크) */
const requiredOnly = {
  ...INITIAL_CONSENT_STATE,
  age14: true,
  termsOfService: true,
  privacy: true,
  location: true,
};

describe("동의 항목 카탈로그 (AC 8·9)", () => {
  it("항목 5행의 라벨이 정본 문구와 정확히 일치한다 (AC 8)", () => {
    expect(CONSENT_ITEMS.map((item) => item.label)).toEqual([
      "만 14세 이상입니다. (필수)",
      "서비스 이용약관에 동의 (필수)",
      "개인정보 수집 및 이용에 동의 (필수)",
      "위치기반서비스 이용약관에 동의 (필수)",
      "마케팅 정보 수신에 동의 (선택)",
    ]);
  });

  it("만 14세 행에만 '보기'(약관 전문)가 없고 나머지 4행은 전문 제목을 갖는다 (AC 8·25)", () => {
    expect(CONSENT_ITEMS.map((item) => [item.id, item.termsTitle])).toEqual([
      ["age14", null],
      ["termsOfService", "서비스 이용약관"],
      ["privacy", "개인정보 수집 및 이용"],
      ["location", "위치기반서비스 이용약관"],
      ["marketing", "마케팅 정보 수신"],
    ]);
  });

  it("마케팅만 선택 항목이고 나머지 4개는 필수다 (AC 16·17)", () => {
    expect(
      CONSENT_ITEMS.filter((item) => item.required).map((item) => item.id),
    ).toEqual(["age14", "termsOfService", "privacy", "location"]);
  });

  it("초기 진입 상태는 5개가 전부 미체크다 (AC 9)", () => {
    expect(Object.values(INITIAL_CONSENT_STATE)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(canSubmitConsent(INITIAL_CONSENT_STATE)).toBe(false);
  });
});

describe("체크 상호작용 (AC 13·14·15)", () => {
  it("모두 동의를 탭하면 5개 항목이 전부 체크된다 (AC 13)", () => {
    const next = toggleAll(true);

    expect(Object.values(next).every(Boolean)).toBe(true);
    expect(isAllAgreed(next)).toBe(true);
  });

  it("전부 체크된 상태에서 모두 동의를 다시 탭하면 5개가 전부 해제된다 (AC 13)", () => {
    const agreed = toggleAll(true);

    const next = toggleAll(!isAllAgreed(agreed));

    expect(Object.values(next).some(Boolean)).toBe(false);
  });

  it("전부 체크된 상태에서 개별 항목 하나를 해제하면 모두 동의 체크가 풀린다 (AC 14)", () => {
    const agreed = toggleAll(true);

    const next = toggleItem(agreed, "marketing");

    expect(next.marketing).toBe(false);
    expect(isAllAgreed(next)).toBe(false);
  });

  it("개별 항목 5개를 모두 체크하면 모두 동의가 자동으로 체크된다 (AC 15)", () => {
    const filled = CONSENT_ITEMS.reduce(
      (state, item) => toggleItem(state, item.id),
      INITIAL_CONSENT_STATE,
    );

    expect(isAllAgreed(filled)).toBe(true);
  });

  it("개별 항목 토글은 해당 항목만 뒤집고 나머지를 보존한다 (AC 14)", () => {
    const next = toggleItem(requiredOnly, "privacy");

    expect(next).toEqual({ ...requiredOnly, privacy: false });
  });
});

describe("CTA 활성 조건 (AC 16·17)", () => {
  it("필수 4개가 모두 체크되면 CTA가 활성화된다 (AC 16)", () => {
    expect(canSubmitConsent(requiredOnly)).toBe(true);
  });

  it("필수 항목이 하나라도 빠지면 CTA가 비활성이다 (AC 16)", () => {
    for (const id of [
      "age14",
      "termsOfService",
      "privacy",
      "location",
    ] as const) {
      expect(canSubmitConsent(toggleItem(requiredOnly, id))).toBe(false);
    }
  });

  it("마케팅 체크 여부는 CTA 활성 조건에 영향을 주지 않는다 (AC 17)", () => {
    expect(canSubmitConsent(toggleItem(requiredOnly, "marketing"))).toBe(true);
    expect(
      canSubmitConsent({ ...INITIAL_CONSENT_STATE, marketing: true }),
    ).toBe(false);
  });
});
