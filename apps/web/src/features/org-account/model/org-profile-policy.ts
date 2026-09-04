/**
 * 담당자 정보 제약 (MSG-544 AC 3) — 서버 DTO의 제약을 그대로 옮긴 순수 판정이다:
 * `contactName` 2~20자(users.nickname 저장), `contactPhone` "숫자로 시작하고 끝나는
 * 숫자·하이픈 9~20자" (`OrgProfileUpdateRequestDto`).
 *
 * FE 선검증의 목적은 서버를 대체하는 것이 아니라 확실히 거절될 요청을 내보내지 않는
 * 것이다 — 최종 판정은 항상 서버다 (password-policy와 같은 관례).
 *
 * `PATCH /api/org/profile`은 두 필드가 모두 required라 **부분 PATCH가 아니다** — 연락처를
 * 한 번도 입력하지 않은 계정(`contactPhone: null`)도 저장하려면 연락처를 채워야 하므로
 * 빈 값은 여기서 거절된다.
 *
 * 플랫폼 중립(웹 API·라우터 참조 없음) — RN 재사용 대상이다.
 */

export const CONTACT_NAME_MIN_LENGTH = 2;
export const CONTACT_NAME_MAX_LENGTH = 20;

/** 규칙 안내 문구 — 입력 아래 힌트와 미충족 안내가 같은 문자열을 쓴다 */
export const CONTACT_NAME_RULE_HINT = "담당자 이름은 2~20자로 입력해주세요";
export const CONTACT_PHONE_RULE_HINT =
  "연락처는 숫자로 시작·끝나는 숫자와 하이픈 9~20자로 입력해주세요";

/** 숫자로 시작·끝나고 사이는 숫자·하이픈 — 전체 길이 9~20자(양끝 2 + 가운데 7~18) */
const CONTACT_PHONE_PATTERN = /^\d[\d-]{7,18}\d$/;

/**
 * @example
 * isValidContactName("김민지 주무관") // true
 */
export const isValidContactName = (value: string): boolean =>
  value.length >= CONTACT_NAME_MIN_LENGTH &&
  value.length <= CONTACT_NAME_MAX_LENGTH;

/**
 * @example
 * isValidContactPhone("051-888-0000") // true
 */
export const isValidContactPhone = (value: string): boolean =>
  CONTACT_PHONE_PATTERN.test(value);

/**
 * 제출을 막아야 할 사유 — 없으면 null (AC 3). 이름을 먼저 안내한다: 두 값이 다 어긋난
 * 입력에서 뒤 필드만 보여주면 정작 위에서 고쳐야 할 규칙이 가린다
 * (`newPasswordError`의 순서 규칙과 같은 이유).
 */
export const contactFormError = (
  contactName: string,
  contactPhone: string,
): string | null => {
  if (!isValidContactName(contactName)) return CONTACT_NAME_RULE_HINT;
  if (!isValidContactPhone(contactPhone)) return CONTACT_PHONE_RULE_HINT;
  return null;
};
