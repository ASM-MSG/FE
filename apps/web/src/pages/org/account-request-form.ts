import { isEmailFormat } from "@/features/auth/model/email-format";
import type { OrgAccountRequestCreateRequestDto } from "@/shared/api/generated/types.gen";

/**
 * 계정 발급 요청 선검증 (MSG-543 AC 2) — `OrgAccountRequestCreateRequestDto`의 제약을
 * 그대로 옮긴 순수 판정이다: orgName 1~100 · contactName 2~20 · contactPhone
 * `^[0-9][0-9-]{7,18}[0-9]$` · email(format: email, ≤255) · eventName 1~200 ·
 * content 1~2000, 전부 required.
 *
 * FE 선검증의 목적은 서버를 대체하는 것이 아니라 확실히 거절될 요청을 내보내지 않는
 * 것이다(password-policy 선례) — 최종 판정은 서버다. 동의 체크는 DTO에 대응 필드가 없어
 * **제출 게이트로만** 쓰이고 서버로 전송되지 않는다(추정 3).
 *
 * 값은 판정 전에 trim한다 — 공백만 채운 필수값이 통과해 서버 400으로 되돌아오는 것을 막고,
 * 제출 바디도 같은 trim 값으로 조립한다(`toAccountRequestBody`).
 *
 * `contactName` 2~20자는 계정 설정(MSG-544)과 공유 의도가 DTO 주석에 명시돼 있으나 두
 * 티켓이 병렬이라 지금은 이 페이지 로컬로 둔다 — 웨이브 통합 후 공용화는 후속 여지다.
 *
 * 플랫폼 중립(웹 API·라우터 참조 없음) — RN 재사용 대상이다.
 */

export const ORG_NAME_MAX_LENGTH = 100;
export const CONTACT_NAME_MIN_LENGTH = 2;
export const CONTACT_NAME_MAX_LENGTH = 20;
export const EMAIL_MAX_LENGTH = 255;
export const EVENT_NAME_MAX_LENGTH = 200;
export const CONTENT_MAX_LENGTH = 2000;

/** 서버 DTO pattern 이식 — 숫자로 시작·끝나는 숫자·하이픈 9~20자 */
const CONTACT_PHONE_PATTERN = /^[0-9][0-9-]{7,18}[0-9]$/;

/** 폼이 보유하는 값 — `consented`는 제출 게이트 전용이라 DTO에 없다 */
export interface AccountRequestDraft {
  orgName: string;
  contactName: string;
  contactPhone: string;
  email: string;
  eventName: string;
  content: string;
  consented: boolean;
}

export type AccountRequestField = keyof AccountRequestDraft;

/** 필드별 사유 — 키가 없으면 그 필드는 통과 */
export type AccountRequestErrors = Partial<Record<AccountRequestField, string>>;

export interface AccountRequestValidation {
  /** 필드별 판정 — 입력 아래 안내 문구가 그대로 읽는다 */
  errors: AccountRequestErrors;
  /** 종합 판정 — 어긋난 필드가 하나도 없음 */
  isValid: boolean;
}

/** 길이 제약 위반 사유 — 없으면 null */
const lengthError = (
  value: string,
  label: string,
  min: number,
  max: number,
): string | null => {
  if (value.length < min) {
    return min === 1
      ? `${label}을 입력해주세요`
      : `${label}을 ${min}~${max}자로 입력해주세요`;
  }
  if (value.length > max) return `${label}은 ${max}자 이내로 입력해주세요`;
  return null;
};

const phoneError = (value: string): string | null => {
  if (value === "") return "연락처를 입력해주세요";
  return CONTACT_PHONE_PATTERN.test(value)
    ? null
    : "연락처는 숫자와 하이픈만 사용해 9~20자로 입력해주세요";
};

const emailError = (value: string): string | null => {
  if (value === "") return "공식 이메일을 입력해주세요";
  if (value.length > EMAIL_MAX_LENGTH) {
    return `공식 이메일은 ${EMAIL_MAX_LENGTH}자 이내로 입력해주세요`;
  }
  return isEmailFormat(value) ? null : "이메일 형식이 올바르지 않습니다";
};

/**
 * 필드별·종합 판정.
 *
 * @example
 * validateAccountRequest(draft).errors.contactPhone // "연락처를 입력해주세요"
 */
export const validateAccountRequest = (
  draft: AccountRequestDraft,
): AccountRequestValidation => {
  const candidates: [field: AccountRequestField, message: string | null][] = [
    [
      "orgName",
      lengthError(draft.orgName.trim(), "기관명", 1, ORG_NAME_MAX_LENGTH),
    ],
    [
      "contactName",
      lengthError(
        draft.contactName.trim(),
        "담당자명",
        CONTACT_NAME_MIN_LENGTH,
        CONTACT_NAME_MAX_LENGTH,
      ),
    ],
    ["contactPhone", phoneError(draft.contactPhone.trim())],
    ["email", emailError(draft.email.trim())],
    [
      "eventName",
      lengthError(
        draft.eventName.trim(),
        "예정 행사명",
        1,
        EVENT_NAME_MAX_LENGTH,
      ),
    ],
    [
      "content",
      lengthError(draft.content.trim(), "요청 내용", 1, CONTENT_MAX_LENGTH),
    ],
    [
      "consented",
      draft.consented ? null : "입력한 정보 확인에 동의해야 요청할 수 있습니다",
    ],
  ];

  const errors: AccountRequestErrors = {};
  for (const [field, message] of candidates) {
    if (message !== null) errors[field] = message;
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
};

/** 제출 바디 — DTO 6필드만, 판정과 같은 trim 값으로 (동의 상태는 보내지 않는다) */
export const toAccountRequestBody = (
  draft: AccountRequestDraft,
): OrgAccountRequestCreateRequestDto => ({
  orgName: draft.orgName.trim(),
  contactName: draft.contactName.trim(),
  contactPhone: draft.contactPhone.trim(),
  email: draft.email.trim(),
  eventName: draft.eventName.trim(),
  content: draft.content.trim(),
});
