/**
 * 프로필 편집 폼 로직 (MSG-125 → MSG-329 A7 강화).
 * 순수 함수 — 플랫폼 API·라우터 무의존, RN 재사용 대상.
 */

/** 닉네임 최소 길이 — 명세(PUT /api/users/me/nickname) 2자 (A7) */
export const NICKNAME_MIN_LENGTH = 2;
/** 닉네임 최대 길이 — 명세 20자 (A7) */
export const NICKNAME_MAX_LENGTH = 20;

const NICKNAME_LENGTH_MESSAGE = `닉네임은 ${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자로 입력해주세요`;

/**
 * 닉네임 검증 사유 — 범위(2~20자, trim 기준) 밖이면 안내 문구, 유효하면 null. (A7)
 * 중복 닉네임은 명세상 허용이므로 여기서 막지 않는다.
 */
export const nicknameError = (nickname: string): string | null => {
  const length = nickname.trim().length;
  if (length < NICKNAME_MIN_LENGTH || length > NICKNAME_MAX_LENGTH) {
    return NICKNAME_LENGTH_MESSAGE;
  }
  return null;
};

/** 닉네임이 2~20자(trim 기준)면 저장 가능 — 구 "빈 값만 차단"은 1자를 통과시켜 서버 400을 불렀다 (A7) */
export const canSaveProfile = (nickname: string): boolean =>
  nicknameError(nickname) === null;

/** 위치정보 토글 상태 문구 — 켜짐 "사용 중" / 꺼짐 "사용 안 함"(A2) (AC 4) */
export const locationStatusLabel = (enabled: boolean): string =>
  enabled ? "사용 중" : "사용 안 함";
