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
 * [MSG-426] 닉네임·이메일·가입일·프로필이미지는 `GET /api/users/me`가 정본이 됐다
 * (결정 E2). 이 mock은 그 조회의 **로딩·실패 폴백**으로만 남는다 — 화면이 조회에 잠기면
 * 안 되기 때문이다. 스트릭·수집률은 대응 API 연동이 범위 밖이라 여전히 유일한 출처다.
 */
export const MOCK_PROFILE: ProfileData = {
  nickname: "필맵퍼",
  email: "fillmapper@fillmap.app",
  // 미설정(null) — 웹 MOCK_PROFILE(MSG-378) 미러
  profileImageUrl: null,
  joinedAt: "2026-01-12",
  streakDays: 12,
  collectionRate: { regionLabel: "부산", pct: 34 },
};
