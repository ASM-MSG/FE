import { describe, expect, it } from "vitest";
import {
  type AccountRequestDraft,
  toAccountRequestBody,
  validateAccountRequest,
} from "./account-request-form";

/**
 * 계정 발급 요청 선검증 (MSG-543 AC 2) — 서버 DTO 제약과 동일 기준의 필드별 판정.
 * 유효 초안을 기준으로 한 필드씩 어긋나게 해 그 필드만 걸리는지 본다.
 */
const VALID: AccountRequestDraft = {
  orgName: "부산광역시 관광마이스과",
  contactName: "홍길동",
  contactPhone: "010-1234-5678",
  email: "tourism@busan.go.kr",
  eventName: "2026 부산 바다축제",
  content: "부산 바다축제 운영을 위해 행사 등록 권한이 필요합니다.",
  consented: true,
};

const draft = (
  overrides: Partial<AccountRequestDraft>,
): AccountRequestDraft => ({
  ...VALID,
  ...overrides,
});

describe("validateAccountRequest — 유효 초안 (AC 2)", () => {
  it("6필드가 제약을 만족하고 동의했으면 오류 없이 유효하다 (AC 2)", () => {
    const { errors, isValid } = validateAccountRequest(VALID);

    expect(errors).toEqual({});
    expect(isValid).toBe(true);
  });

  it("앞뒤 공백만 다른 값도 trim 후 판정해 유효하다 (AC 2)", () => {
    const { isValid } = validateAccountRequest(
      draft({ orgName: "  부산진구청  ", contactName: " 김담당 " }),
    );

    expect(isValid).toBe(true);
  });
});

describe("validateAccountRequest — 기관명 1~100자 (AC 2)", () => {
  it("기관명이 비면 사유가 안내되고 유효하지 않다 (AC 2)", () => {
    const { errors, isValid } = validateAccountRequest(
      draft({ orgName: "   " }),
    );

    expect(errors.orgName).toBeDefined();
    expect(isValid).toBe(false);
  });

  it("기관명이 100자면 통과하고 101자면 걸린다 (경계, AC 2)", () => {
    expect(
      validateAccountRequest(draft({ orgName: "가".repeat(100) })).errors
        .orgName,
    ).toBeUndefined();
    expect(
      validateAccountRequest(draft({ orgName: "가".repeat(101) })).errors
        .orgName,
    ).toBeDefined();
  });
});

describe("validateAccountRequest — 담당자명 2~20자 (AC 2)", () => {
  it("담당자명이 1자면 걸리고 2자면 통과한다 (경계, AC 2)", () => {
    expect(
      validateAccountRequest(draft({ contactName: "김" })).errors.contactName,
    ).toBeDefined();
    expect(
      validateAccountRequest(draft({ contactName: "김담" })).errors.contactName,
    ).toBeUndefined();
  });

  it("담당자명이 21자면 걸린다 (경계, AC 2)", () => {
    expect(
      validateAccountRequest(draft({ contactName: "가".repeat(21) })).errors
        .contactName,
    ).toBeDefined();
  });
});

describe("validateAccountRequest — 연락처 패턴 (AC 2)", () => {
  it("숫자·하이픈 9자 이상이고 숫자로 시작·끝나면 통과한다 (AC 2)", () => {
    expect(
      validateAccountRequest(draft({ contactPhone: "051-123-4567" })).errors
        .contactPhone,
    ).toBeUndefined();
  });

  it("하이픈으로 끝나면 걸린다 (AC 2)", () => {
    expect(
      validateAccountRequest(draft({ contactPhone: "010-1234-567-" })).errors
        .contactPhone,
    ).toBeDefined();
  });

  it("숫자·하이픈이 아닌 문자가 섞이면 걸린다 (AC 2)", () => {
    expect(
      validateAccountRequest(draft({ contactPhone: "010 1234 5678" })).errors
        .contactPhone,
    ).toBeDefined();
  });

  it("8자면 걸리고 9자면 통과한다 (경계, AC 2)", () => {
    expect(
      validateAccountRequest(draft({ contactPhone: "01012345" })).errors
        .contactPhone,
    ).toBeDefined();
    expect(
      validateAccountRequest(draft({ contactPhone: "010123456" })).errors
        .contactPhone,
    ).toBeUndefined();
  });

  it("21자면 걸린다 (경계, AC 2)", () => {
    expect(
      validateAccountRequest(draft({ contactPhone: "1".repeat(21) })).errors
        .contactPhone,
    ).toBeDefined();
  });
});

describe("validateAccountRequest — 공식 이메일 (AC 2)", () => {
  it("이메일 형식이 아니면 걸린다 (AC 2)", () => {
    expect(
      validateAccountRequest(draft({ email: "tourism.busan.go.kr" })).errors
        .email,
    ).toBeDefined();
  });

  it("255자를 넘으면 걸린다 (경계, AC 2)", () => {
    const local = "a".repeat(255 - "@busan.go.kr".length + 1);

    expect(
      validateAccountRequest(draft({ email: `${local}@busan.go.kr` })).errors
        .email,
    ).toBeDefined();
  });
});

describe("validateAccountRequest — 예정 행사명 1~200자 (AC 2)", () => {
  it("예정 행사명이 비면 걸린다 (AC 2)", () => {
    expect(
      validateAccountRequest(draft({ eventName: "" })).errors.eventName,
    ).toBeDefined();
  });

  it("201자면 걸린다 (경계, AC 2)", () => {
    expect(
      validateAccountRequest(draft({ eventName: "가".repeat(201) })).errors
        .eventName,
    ).toBeDefined();
  });
});

describe("validateAccountRequest — 요청 내용 1~2000자 (AC 2)", () => {
  it("요청 내용이 비면 걸린다 (AC 2)", () => {
    expect(
      validateAccountRequest(draft({ content: "" })).errors.content,
    ).toBeDefined();
  });

  it("2001자면 걸린다 (경계, AC 2)", () => {
    expect(
      validateAccountRequest(draft({ content: "가".repeat(2001) })).errors
        .content,
    ).toBeDefined();
  });
});

describe("validateAccountRequest — 동의 체크 (AC 2·추정 3)", () => {
  it("동의하지 않으면 다른 필수값과 같이 사유가 안내된다 (AC 2)", () => {
    const { errors, isValid } = validateAccountRequest(
      draft({ consented: false }),
    );

    expect(errors.consented).toBeDefined();
    expect(isValid).toBe(false);
  });
});

describe("validateAccountRequest — 여러 필드 동시 위반 (AC 2)", () => {
  it("어긋난 필드마다 각자의 사유가 모두 반환된다 (AC 2)", () => {
    const { errors } = validateAccountRequest({
      orgName: "",
      contactName: "",
      contactPhone: "",
      email: "",
      eventName: "",
      content: "",
      consented: false,
    });

    expect(Object.keys(errors).sort()).toEqual(
      [
        "consented",
        "contactName",
        "contactPhone",
        "content",
        "email",
        "eventName",
        "orgName",
      ].sort(),
    );
  });
});

describe("toAccountRequestBody — 제출 바디 (AC 3)", () => {
  it("동의 상태를 제외한 DTO 6필드만 trim된 값으로 조립한다 (AC 3·추정 3)", () => {
    const body = toAccountRequestBody(
      draft({ orgName: "  부산진구청 ", content: " 계정이 필요합니다. " }),
    );

    expect(body).toEqual({
      orgName: "부산진구청",
      contactName: "홍길동",
      contactPhone: "010-1234-5678",
      email: "tourism@busan.go.kr",
      eventName: "2026 부산 바다축제",
      content: "계정이 필요합니다.",
    });
  });
});
