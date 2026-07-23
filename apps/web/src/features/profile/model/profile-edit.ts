/**
 * 프로필 편집 폼 로직 (MSG-125).
 * 순수 함수 — 플랫폼 API·라우터 무의존, RN 재사용 대상.
 */

/** 닉네임이 빈 값(공백만 포함, A3)이면 저장 불가 (AC 6) */
export const canSaveProfile = (nickname: string): boolean =>
  nickname.trim().length > 0;

/** 위치정보 토글 상태 문구 — 켜짐 "사용 중" / 꺼짐 "사용 안 함"(A2) (AC 4) */
export const locationStatusLabel = (enabled: boolean): string =>
  enabled ? "사용 중" : "사용 안 함";
