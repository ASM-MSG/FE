/**
 * 프로필 도메인 모델 (MSG-306) — 웹 entities/profile/model/profile.ts(MSG-124) 미러.
 * 플랫폼 API·라우터 무의존.
 */

/** 프로필 화면 데이터 계약 — 실 API 전환 시에도 이 형태를 유지한다 */
export interface ProfileData {
  nickname: string;
  email: string;
  /** 가입일 ISO 문자열 — 표시 포맷은 formatJoinedDate가 담당 (AC 3) */
  joinedAt: string;
  /** 연속 스트릭 일수 — 도감 MOCK_COLLECTION_SUMMARY.streakDays와 같은 사용자 값 (AC 4) */
  streakDays: number;
  /** 수집률 — 지역 라벨 + 백분율 (mock 단계는 시 단위 "부산") */
  collectionRate: {
    regionLabel: string;
    pct: number;
  };
  /** 앱 버전 표시값 — mock 상수, 실 배포 시 빌드 주입 값으로 교체 (AC 6) */
  appVersion: string;
  /** 위치정보 사용 여부 — 프로필 편집 토글 초기값 (AC 11) */
  locationEnabled: boolean;
}
