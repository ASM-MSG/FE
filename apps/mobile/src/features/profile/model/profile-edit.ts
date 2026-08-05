/**
 * 프로필 편집 폼 로직 (MSG-306) — 웹 profile-edit(MSG-125) 미러, parity 테스트가 고정.
 * 순수 함수 — 플랫폼 API·라우터 무의존.
 */

/** 닉네임이 빈 값(공백만 포함)이면 저장 불가 (AC 16, 승인 추정 4) */
export const canSaveProfile = (nickname: string): boolean =>
  nickname.trim().length > 0;

/** 위치정보 토글 상태 문구 — 켜짐 "사용 중" / 꺼짐 "사용 안 함" (AC 15, 승인 추정 3) */
export const locationStatusLabel = (enabled: boolean): string =>
  enabled ? "사용 중" : "사용 안 함";
