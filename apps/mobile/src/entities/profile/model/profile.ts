import type { UserProfileResponseDto } from "../../../shared/api/sdk";

/**
 * 프로필 도메인 모델 (MSG-306 → MSG-426 getMe 최소 연동).
 * 플랫폼 API·라우터 무의존.
 */

/**
 * 서버가 정본인 신원 필드 (MSG-426 결정 E2) — `GET /api/users/me`에서 온다.
 * 스트릭·수집률은 `features/profile/api/use-activity-query`(MSG-564), 앱 버전은 빌드값이다.
 * 구 `ProfileData`(스트릭·수집률 mock 계약)는 소비처가 0이 되어 MSG-564에서 삭제됐다.
 */
export interface ProfileIdentity {
  nickname: string;
  /** 가입 이메일 — 카카오 가입은 이메일을 수집하지 않아 null (명세) */
  email: string | null;
  /** 프로필 이미지 URL — 미설정이면 null, 기본 이미지 표시는 FE 몫 (기준 12) */
  profileImageUrl: string | null;
  /** 가입일 ISO 문자열 — 명세 `createdAt` 대응. 표시 포맷은 formatJoinedDate가 담당 */
  joinedAt: string;
}

/** 명세 응답 → 화면 계약 매핑 — email null은 그대로 보존한다 (웹 toProfileData 미러) */
export const toProfileIdentity = (
  dto: UserProfileResponseDto,
): ProfileIdentity => ({
  nickname: dto.nickname,
  email: dto.email,
  profileImageUrl: dto.profileImageUrl,
  joinedAt: dto.createdAt,
});
