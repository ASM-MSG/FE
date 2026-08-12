/**
 * 아바타 fallback 이니셜 (MSG-125 리뷰 반영 — ProfileHeader·ProfileEditModal 중복 추출).
 * 순수 함수 — 플랫폼 API·라우터 무의존, RN 재사용 대상.
 *
 * [MSG-378] 웹 사용처(ProfileHeader·ProfileEditModal)는 기본 이미지 에셋으로 전환되어
 * 웹 내 사용처가 없다 — 다만 apps/mobile의 avatar-fallback.parity.test가 이 원본을
 * 동등성 기준으로 참조하므로 제거하지 않는다. 모바일이 기본 이미지로 전환하는 후속
 * 티켓에서 양쪽을 함께 정리한다 (빌드 리포트 스펙 이슈 참조).
 */

/** 닉네임 첫 글자를 아바타 fallback 이니셜로 반환한다 (빈 문자열이면 빈 문자열) */
export const avatarFallback = (nickname: string): string =>
  nickname.slice(0, 1);
