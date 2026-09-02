/**
 * 새 비밀번호 정책 (MSG-542 AC 6) — 서버 DTO의 제약을 그대로 옮긴 순수 판정이다:
 * `minLength: 8, maxLength: 64, pattern: ^(?=.*[A-Za-z])(?=.*\d).+$`
 * (`PasswordInitialRequestDto`·`PasswordResetConfirmRequestDto`의 `newPassword`).
 *
 * FE 선검증의 목적은 **서버를 대체하는 것이 아니라** 확실히 거절될 요청을 내보내지 않는
 * 것이다 — 최종 판정은 항상 서버다. 첫 로그인 설정(setup)과 재설정 링크 확정(reset)이
 * 같은 제약을 쓰므로 두 화면이 이 모듈을 공유한다.
 *
 * 플랫폼 중립(웹 API·라우터 참조 없음) — RN 재사용 대상이다.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

/** 규칙 힌트 문구 — 입력 아래 힌트와 미충족 안내가 같은 문자열을 쓴다 (Figma 15836:357) */
export const PASSWORD_RULE_HINT = "영문과 숫자 각 1자 이상, 8~64자";

export interface PasswordCheck {
  key: "length" | "letter" | "digit";
  label: string;
  satisfied: boolean;
}

export interface NewPasswordPolicy {
  /** 요건별 개별 판정 — 힌트 목록과 충족 게이지가 함께 읽는다 */
  checks: PasswordCheck[];
  /** 충족한 요건 수 — 게이지는 강도 측정이 아니라 이 비율 표시다 (추정 8) */
  satisfiedCount: number;
  /** 종합 판정 — 요건 전부 충족 */
  isValid: boolean;
}

/**
 * 새 비밀번호의 요건별·종합 판정.
 *
 * @example
 * validateNewPassword("fillmap12").isValid // true
 */
export const validateNewPassword = (password: string): NewPasswordPolicy => {
  const checks: PasswordCheck[] = [
    {
      key: "length",
      label: `${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자`,
      satisfied:
        password.length >= PASSWORD_MIN_LENGTH &&
        password.length <= PASSWORD_MAX_LENGTH,
    },
    {
      key: "letter",
      label: "영문 1자 이상",
      satisfied: /[A-Za-z]/.test(password),
    },
    { key: "digit", label: "숫자 1자 이상", satisfied: /\d/.test(password) },
  ];
  const satisfiedCount = checks.filter((check) => check.satisfied).length;

  return { checks, satisfiedCount, isValid: satisfiedCount === checks.length };
};

/**
 * 제출을 막아야 할 사유 — 없으면 null (AC 6). 정책 미충족을 확인 불일치보다 먼저
 * 안내한다: 둘 다 어긋난 입력에서 "확인이 다르다"만 보여주면 정작 고쳐야 할 규칙이 가린다.
 */
export const newPasswordError = (
  password: string,
  confirmation: string,
): string | null => {
  if (!validateNewPassword(password).isValid) {
    return `${PASSWORD_RULE_HINT}로 입력해주세요`;
  }
  if (password !== confirmation) return "비밀번호 확인이 일치하지 않습니다";
  return null;
};
