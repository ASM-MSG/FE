import { describe, expect, it } from "vitest";
import {
  CONTACT_NAME_RULE_HINT,
  CONTACT_PHONE_RULE_HINT,
  contactFormError,
  isValidContactName,
  isValidContactPhone,
} from "./org-profile-policy";

describe("isValidContactName — 담당자 이름 2~20자 (AC 3)", () => {
  it("2자·20자 경계는 통과한다 (AC 3)", () => {
    expect(isValidContactName("김민")).toBe(true);
    expect(isValidContactName("가".repeat(20))).toBe(true);
  });

  it("1자·21자는 거절한다 — 경계 밖 (AC 3)", () => {
    expect(isValidContactName("김")).toBe(false);
    expect(isValidContactName("가".repeat(21))).toBe(false);
  });

  it("빈 값은 거절한다 — 두 필드 모두 required라 미입력 계정도 채워야 한다 (AC 3)", () => {
    expect(isValidContactName("")).toBe(false);
  });
});

describe("isValidContactPhone — 숫자 시작·끝, 숫자·하이픈 9~20자 (AC 3)", () => {
  it("하이픈이 섞인 일반 연락처를 통과시킨다 (AC 3)", () => {
    expect(isValidContactPhone("051-888-0000")).toBe(true);
  });

  it("9자·20자 경계는 통과한다 (AC 3)", () => {
    expect(isValidContactPhone("051888000")).toBe(true);
    expect(isValidContactPhone("0".repeat(20))).toBe(true);
  });

  it("8자·21자는 거절한다 — 길이 경계 밖 (AC 3)", () => {
    expect(isValidContactPhone("05188800")).toBe(false);
    expect(isValidContactPhone("0".repeat(21))).toBe(false);
  });

  it("하이픈으로 시작하거나 끝나면 거절한다 (AC 3)", () => {
    expect(isValidContactPhone("-51-888-0000")).toBe(false);
    expect(isValidContactPhone("051-888-000-")).toBe(false);
  });

  it("숫자·하이픈 외 문자가 섞이면 거절한다 (AC 3)", () => {
    expect(isValidContactPhone("051 888 0000")).toBe(false);
    expect(isValidContactPhone("051-888-000a")).toBe(false);
  });

  it("빈 값은 거절한다 — contactPhone이 null인 계정도 저장 시 입력이 필요하다 (AC 3)", () => {
    expect(isValidContactPhone("")).toBe(false);
  });
});

describe("contactFormError — 제출을 막아야 할 사유 (AC 3)", () => {
  it("두 값이 모두 유효하면 null이다 (AC 3)", () => {
    expect(contactFormError("김민지 주무관", "051-888-0000")).toBeNull();
  });

  it("이름이 어긋나면 이름 규칙을 먼저 안내한다 (AC 3)", () => {
    expect(contactFormError("김", "051-888-0000")).toBe(CONTACT_NAME_RULE_HINT);
  });

  it("이름이 맞고 연락처가 어긋나면 연락처 규칙을 안내한다 (AC 3)", () => {
    expect(contactFormError("김민지 주무관", "051")).toBe(
      CONTACT_PHONE_RULE_HINT,
    );
  });
});
