/**
 * 이메일 형식 판정 (MSG-542 AC 9) — 재설정 요청이 확실히 거절될 값을 서버에 보내지 않게
 * 하는 선검증이다. 서버 DTO는 `format: email, maxLength: 255`(`PasswordResetRequestDto`)이고
 * 최종 판정은 서버다 — 여기서는 로컬부·`@`·점 있는 도메인만 본다(과도한 정규식은 정상
 * 주소를 거절하는 쪽으로 틀린다).
 *
 * 플랫폼 중립 — RN 재사용 대상이다.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @example
 * isEmailFormat("tourism@busan.go.kr") // true
 */
export const isEmailFormat = (value: string): boolean =>
  EMAIL_PATTERN.test(value);
