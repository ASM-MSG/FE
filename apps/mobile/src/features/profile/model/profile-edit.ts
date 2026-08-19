/**
 * 프로필 편집 폼 로직 (MSG-306 → MSG-426 웹 A7판 포팅) — 웹 profile-edit 미러,
 * parity 테스트가 고정한다. 순수 함수 — 플랫폼 API·라우터 무의존.
 *
 * 구 `locationStatusLabel`(위치정보 토글 상태 문구)은 유일 사용처인 편집 화면 토글이
 * 기준 16으로 제거되면서 함께 삭제됐다 — 웹도 MSG-407에서 같은 이유로 삭제했다.
 */

/** 닉네임 최소 길이 — 명세(PUT /api/users/me/nickname) 2자 */
export const NICKNAME_MIN_LENGTH = 2;
/** 닉네임 최대 길이 — 명세 20자 */
export const NICKNAME_MAX_LENGTH = 20;

const NICKNAME_LENGTH_MESSAGE = `닉네임은 ${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자로 입력해주세요`;

/**
 * 닉네임 검증 사유 — 범위(2~20자, trim 기준) 밖이면 안내 문구, 유효하면 null. (기준 17)
 * 중복 닉네임은 명세상 허용이므로 여기서 막지 않는다.
 */
export const nicknameError = (nickname: string): string | null => {
  const length = nickname.trim().length;
  if (length < NICKNAME_MIN_LENGTH || length > NICKNAME_MAX_LENGTH) {
    return NICKNAME_LENGTH_MESSAGE;
  }
  return null;
};

/** 닉네임이 2~20자(trim 기준)면 저장 가능 — 구 "빈 값만 차단"은 1자를 통과시켜 서버 400을 불렀다 (기준 17) */
export const canSaveProfile = (nickname: string): boolean =>
  nicknameError(nickname) === null;

/**
 * [기본 이미지로] 예약이 실제 삭제 요청을 만들어야 하는지 (기준 15).
 * 이미 기본 이미지(profileImageUrl=null)면 무변경이므로 요청을 생략한다 — 웹은 같은 판정을
 * 모달 핸들러에 인라인으로 두지만, 모바일은 화면 렌더 테스트가 없어 순수 함수로 떼어 고정한다.
 */
export const shouldRemoveProfileImage = (
  reserved: boolean,
  profileImageUrl: string | null,
): boolean => reserved && profileImageUrl !== null;

/**
 * 저장할 닉네임과 요청 필요 여부. 앞뒤 공백은 잘라내고, 현재 값과 같으면 요청을 생략한다.
 * trim은 공백 선두 닉네임이 아바타 이니셜을 빈 칸으로 만드는 결함을 막는다 —
 * 구 profile-store가 저장 시점에 하던 일이고, 그 스토어가 폐기되면서 이 함수가 승계했다.
 */
export const resolveNicknameSave = (
  input: string,
  current: string,
): { nickname: string; shouldRequest: boolean } => {
  const nickname = input.trim();
  return { nickname, shouldRequest: nickname !== current };
};
