import { describe, expect, it } from "vitest";
import {
  MARKETING_SAVE_ERROR_TEXT,
  canRevokeLocationConsent,
  consentRows,
  locationConsentNotice,
  requiredConsentCompleted,
  resolveMarketingErrorText,
} from "./consent-settings";

/**
 * 템플릿 ① 순수 로직 — 위치정보 동의 관리 화면의 표시 파생 (기준 9·12·16).
 * RN 렌더 테스트 인프라가 없어(vitest.config 상단 정책) 화면은 이 파생만 읽는 얇은 층이다.
 */

/** `GET /api/users/me/consents` 응답 6필드 — 필수 완료 + 마케팅 동의 상태 */
const allAgreed = {
  ageOver14: true,
  serviceTerms: true,
  privacyPolicy: true,
  locationTerms: true,
  marketing: true,
  requiredCompleted: true,
};

describe("consentRows — 동의 상태 6필드 → 표시 행 파생 (기준 9)", () => {
  it("필수 4종이 상태 표시 행, 마케팅이 토글 행으로 파생된다 (기준 9)", () => {
    const rows = consentRows(allAgreed);

    expect(rows.map((row) => [row.id, row.required])).toEqual([
      ["ageOver14", true],
      ["serviceTerms", true],
      ["privacyPolicy", true],
      ["locationTerms", true],
      ["marketing", false],
    ]);
  });

  it("각 행의 동의 여부가 응답 필드에서 그대로 파생된다 (기준 9)", () => {
    const rows = consentRows({ ...allAgreed, marketing: false });

    expect(rows.map((row) => row.agreed)).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
  });

  it("전문 '보기'가 있는 행만 문서 키를 갖고 만 14세 행은 null이다 (기준 17)", () => {
    expect(consentRows(allAgreed).map((row) => row.docKey)).toEqual([
      null,
      "service",
      "privacy-collection",
      "location",
      "marketing",
    ]);
  });

  it("응답이 없거나 필드가 비어도 행 5개가 미동의로 그려진다 — 화면이 빈칸이 되지 않는다 (기준 9·10)", () => {
    expect(consentRows(undefined).map((row) => row.agreed)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(consentRows({ marketing: true }).map((row) => row.agreed)).toEqual([
      false,
      false,
      false,
      false,
      true,
    ]);
  });
});

describe("requiredConsentCompleted — 필수 완료 필드 파생 (기준 9)", () => {
  it("서버가 계산한 requiredCompleted를 그대로 읽는다 — 클라이언트가 다시 조립하지 않는다 (기준 9)", () => {
    expect(requiredConsentCompleted(allAgreed)).toBe(true);
    expect(
      requiredConsentCompleted({ ...allAgreed, requiredCompleted: false }),
    ).toBe(false);
    expect(requiredConsentCompleted(undefined)).toBe(false);
  });
});

describe("위치기반 동의 철회 판정 (기준 15·16)", () => {
  it("서버 계약상 위치기반 동의는 철회할 수 없다고 판정한다 — 철회 조작을 화면에 두지 않는 근거 (기준 16)", () => {
    expect(canRevokeLocationConsent()).toBe(false);
  });

  it("철회 불가 고지가 철회 불가 사실과 계정 삭제 대체 경로를 함께 알린다 (기준 15·16)", () => {
    const notice = locationConsentNotice();

    expect(notice).toContain("철회");
    expect(notice).toContain("계정 삭제");
  });
});

describe("resolveMarketingErrorText — 마케팅 저장 실패 안내 (기준 12)", () => {
  it("저장에 실패하면 재시도 안내 문구를 돌려준다 (기준 12)", () => {
    expect(resolveMarketingErrorText(true)).toBe(MARKETING_SAVE_ERROR_TEXT);
  });

  it("실패가 없으면 안내를 붙이지 않는다 (기준 12)", () => {
    expect(resolveMarketingErrorText(false)).toBeUndefined();
  });
});
