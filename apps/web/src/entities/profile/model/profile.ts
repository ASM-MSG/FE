import type { UserProfileResponseDto } from "@/shared/api/generated/types.gen";

/**
 * 프로필 도메인 모델 (MSG-124).
 * 플랫폼 API·라우터 무의존 — RN 재사용 대상.
 */

/**
 * 명세 대응 필드 (MSG-322) — `UserProfileResponseDto`에서 type-only 파생 (cell.ts·dex.ts 관례).
 * 명세 필드명 변경·제거 시 이 Pick/인덱스 접근이 typecheck로 잡는다.
 * - email: 가입 이메일 — 명세상 `string | null` (카카오 가입은 이메일 미수집, MSG-310)
 * - nickname: 닉네임 — 카카오 로그인 시 자동 저장, 이후 수정 가능
 * - profileImageUrl: 프로필 이미지 공개 URL — 미설정이면 null, 기본 이미지 표시는 FE 몫 (MSG-378)
 * - joinedAt: 가입 시각 — 명세 `createdAt` 대응, FE 표기명만 다르다 (MSG-378 확장 — getMe 실 API 전환으로
 *   "명세 부재, 백엔드 환류 후보"에서 현행화). 표시 포맷은 formatJoinedDate가 담당 (AC 3)
 */
type ProfileSpecFields = Required<
  Pick<UserProfileResponseDto, "email" | "nickname" | "profileImageUrl">
> & {
  joinedAt: UserProfileResponseDto["createdAt"];
};

/**
 * FE 확장 필드 — 명세(UserProfileResponseDto)에 대응이 없는 화면 전용 필드 (MSG-322).
 * 조회는 실 API(getMe)로 전환됐지만(MSG-378 확장) 이 필드들은 여전히 명세 부재라
 * mock 값으로 병합된다 — 각 주석의 출처를 따른다.
 */
interface ProfileExtension {
  /**
   * 연속 스트릭 일수 — 도감 summary.streakDays와 같은 사용자 값 (AC 5).
   * 명세 전체 부재 — 백엔드 환류 후보
   */
  streakDays: number;
  /**
   * 수집률 — 지역 라벨 + 백분율 (mock 단계는 시 단위 "부산", R2: 백엔드 계약 확정 시 정리).
   * 명세 부재 — RegionStatResponseDto(행정동 단위)와 축이 달라 대응 없음, 백엔드 환류 후보
   */
  collectionRate: {
    regionLabel: string;
    pct: number;
  };
  /** 앱 버전 표시값 — 클라이언트 전용 (mock 상수, 실 배포 시 빌드 주입 값으로 교체, A3) */
  appVersion: string;
  /** 위치정보 사용 여부 — 프로필 편집 모달 토글 초기값 (MSG-125 A1). 클라이언트 전용 */
  locationEnabled: boolean;
}

/** 프로필 화면 데이터 계약 — 실 API 전환 시에도 이 형태를 유지한다 (A7) = 명세 대응 + FE 확장 */
export type ProfileData = ProfileSpecFields & ProfileExtension;
