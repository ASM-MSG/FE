import type { UserProfileResponseDto } from "../../../shared/api/sdk";

/**
 * 프로필 도메인 모델 (MSG-306 → MSG-426 getMe 최소 연동).
 * 플랫폼 API·라우터 무의존.
 */

/**
 * 서버가 정본인 신원 필드 (MSG-426 결정 E2) — `GET /api/users/me`에서 온다.
 * 스트릭·수집률·앱 버전은 이 조회에 없어 여전히 mock/빌드값이다.
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

/**
 * 프로필 화면 데이터 계약 — 조회 실패·로딩 중 폴백으로 쓰이는 mock의 형태이기도 하다.
 * [MSG-426] `locationEnabled`는 유일 사용처인 편집 화면 위치정보 토글이 기준 16으로
 * 제거되면서, `appVersion`은 표시값이 빌드 주입(`Constants.expoConfig.version`, 결정 Q4)으로
 * 바뀌면서 계약에서 빠졌다 — 남겨 두면 화면이 읽지 않는 거짓 mock이 된다.
 */
export interface ProfileData extends ProfileIdentity {
  email: string;
  /** 연속 스트릭 일수 — 도감 MOCK_COLLECTION_SUMMARY.streakDays와 같은 사용자 값 (AC 4) */
  streakDays: number;
  /** 수집률 — 지역 라벨 + 백분율 (mock 단계는 시 단위 "부산") */
  collectionRate: {
    regionLabel: string;
    pct: number;
  };
}
