import type { UserProfileResponseDto } from "@/shared/api/generated/types.gen";

/**
 * 프로필 도메인 모델 (MSG-124 → MSG-329 실 API 전환).
 * 플랫폼 API·라우터 무의존 — RN 재사용 대상.
 */

/**
 * 명세 대응 필드 — `UserProfileResponseDto`에서 type-only 파생 (cell.ts·dex.ts 관례).
 * 명세 필드명 변경·제거 시 이 Pick이 typecheck로 잡는다.
 * - email: 가입 이메일 — 명세상 `string | null` (카카오 가입은 이메일 미수집, MSG-310)
 * - nickname: 닉네임 — 카카오 로그인 시 자동 저장, 이후 수정 가능
 */
type ProfileSpecFields = Required<
  Pick<UserProfileResponseDto, "email" | "nickname">
>;

/**
 * FE 확장 필드 — 명세 부재의 화면 전용 필드.
 * [MSG-329 정리] 구 mock 확장(joinedAt·streakDays·collectionRate·appVersion)은 폐기됐다:
 * 가입일 줄은 렌더하지 않고, "내 활동" 카드는 "—" 표시(A4 — MSG-327 도감 유도 판단 대기),
 * 앱 버전은 빌드 주입 값(`__APP_VERSION__`)이라 조회 데이터가 아니다(A5).
 */
interface ProfileExtension {
  /** 위치정보 사용 여부 — 클라이언트 전용 값 유지 (A6, 서버 반영은 백엔드 환류) */
  locationEnabled: boolean;
}

/** 프로필 화면 데이터 계약 = 명세 대응 + FE 확장 */
export type ProfileData = ProfileSpecFields & ProfileExtension;

/** 위치정보 기본값(켜짐) — 구 mock의 클라이언트 값 승계 (MSG-125 Figma 기본 상태, A6) */
const DEFAULT_LOCATION_ENABLED = true;

/** 명세 응답 → 화면 계약 매핑 (A1) — email null(카카오 가입)은 그대로 보존한다 (A2) */
export const toProfileData = (dto: UserProfileResponseDto): ProfileData => ({
  email: dto.email,
  nickname: dto.nickname,
  locationEnabled: DEFAULT_LOCATION_ENABLED,
});
