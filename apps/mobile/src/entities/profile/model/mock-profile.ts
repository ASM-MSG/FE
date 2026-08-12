import type { ProfileData } from "./profile";

/**
 * 프로필 mock (MSG-306, AC 19) — 웹 MOCK_PROFILE(MSG-124)과 값 동등, parity 테스트가 고정.
 * Figma 14094:4469의 "닉네임"·"가입일 · 이메일 :"·"서울 34%"는 전부 플레이스홀더고
 * 여기 값이 화면의 유일한 출처다. 수집률은 "부산 34%" (MVP 부산 서면 규칙 — 서울 금지, AC 4).
 *
 * 웹은 nickname·streakDays를 도감 mock 참조로 정합했지만, 모바일 도감 mock은
 * features/dex 레이어라 entities에서 참조하면 FSD 역방향 의존이 된다 — 리터럴로 두고
 * 정합은 mock-profile.parity.test가 고정한다 (스펙 구현 계획 "참조 정합 여부는 빌더 판단").
 *
 * 프로필 조회 API(GET /users/me류)는 OpenAPI 명세 부재(스펙 리스크 2) — mock 유지,
 * 백엔드 환류 후보. API 연동 시 profile-store 시드만 교체한다.
 */
export const MOCK_PROFILE: ProfileData = {
  nickname: "필맵퍼",
  email: "fillmapper@fillmap.app",
  // 미설정(null) — 웹 MOCK_PROFILE(MSG-378) 미러, parity 테스트가 고정
  profileImageUrl: null,
  joinedAt: "2026-01-12",
  streakDays: 12,
  collectionRate: { regionLabel: "부산", pct: 34 },
  appVersion: "1.0.0",
  // 위치정보 사용 켜짐 — Figma 기본 상태 (AC 11)
  locationEnabled: true,
};
