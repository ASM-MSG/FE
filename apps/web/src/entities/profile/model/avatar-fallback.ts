/**
 * 아바타 fallback 이니셜 (MSG-125 리뷰 반영 — ProfileHeader·ProfileEditModal 중복 추출).
 * 순수 함수 — 플랫폼 API·라우터 무의존, RN 재사용 대상.
 */

/** 닉네임 첫 글자를 아바타 fallback 이니셜로 반환한다 (빈 문자열이면 빈 문자열) */
export const avatarFallback = (nickname: string): string =>
  nickname.slice(0, 1);
