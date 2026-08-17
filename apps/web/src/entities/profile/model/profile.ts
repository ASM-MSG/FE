import type { UserProfileResponseDto } from "@/shared/api/generated/types.gen";

/**
 * 프로필 도메인 모델 (MSG-124 → MSG-329 실 API 전환 + MSG-378 이미지·가입일).
 * 플랫폼 API·라우터 무의존 — RN 재사용 대상.
 */

/**
 * 명세 대응 필드 — `UserProfileResponseDto`에서 type-only 파생 (cell.ts·dex.ts 관례).
 * 명세 필드명 변경·제거 시 이 Pick/인덱스 접근이 typecheck로 잡는다.
 * - email: 가입 이메일 — 명세상 `string | null` (카카오 가입은 이메일 미수집, MSG-310)
 * - nickname: 닉네임 — 카카오 로그인 시 자동 저장, 이후 수정 가능
 * - profileImageUrl: 프로필 이미지 공개 URL — 미설정이면 null, 기본 이미지 표시는 FE 몫 (MSG-378)
 * - joinedAt: 가입 시각 — 명세 `createdAt` 대응, FE 표기명만 다르다 (MSG-378 확장 — getMe 실 API 전환으로
 *   "명세 부재, 백엔드 환류 후보"에서 현행화). 표시 포맷은 formatJoinedDate가 담당 (AC 3)
 * - locationEnabled: 위치기반서비스 이용 동의 — 명세 `locationConsent` 대응 (MSG-407 기준 12,
 *   구 "클라이언트 전용 값 유지(A6)"는 서버 게이트 배포(MSG-402)로 폐기)
 */
type ProfileSpecFields = Required<
  Pick<UserProfileResponseDto, "email" | "nickname" | "profileImageUrl">
> & {
  joinedAt: UserProfileResponseDto["createdAt"];
  locationEnabled: UserProfileResponseDto["locationConsent"];
};

/**
 * 프로필 화면 데이터 계약 = 명세 대응 필드 전부.
 * [MSG-329 정리] 구 mock 확장(streakDays·collectionRate·appVersion)은 폐기됐다:
 * "내 활동" 카드는 "—" 표시(A4 — MSG-327 도감 유도 판단 대기),
 * 앱 버전은 빌드 주입 값(`__APP_VERSION__`)이라 조회 데이터가 아니다(A5).
 * [MSG-407 정리] FE 확장 절(ProfileExtension)은 마지막 필드 locationEnabled가 명세
 * 대응(locationConsent)으로 승격되며 소멸 — 하드코딩 기본값(DEFAULT_LOCATION_ENABLED) 폐기.
 */
export type ProfileData = ProfileSpecFields;

/** 명세 응답 → 화면 계약 매핑 (A1) — email null(카카오 가입)은 그대로 보존한다 (A2) */
export const toProfileData = (dto: UserProfileResponseDto): ProfileData => ({
  email: dto.email,
  nickname: dto.nickname,
  profileImageUrl: dto.profileImageUrl,
  joinedAt: dto.createdAt,
  locationEnabled: dto.locationConsent,
});
