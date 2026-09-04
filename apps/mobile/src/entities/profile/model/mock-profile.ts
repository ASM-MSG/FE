import type { ProfileIdentity } from "./profile";

/**
 * 프로필 mock (MSG-306, AC 19) — 웹 MOCK_PROFILE(MSG-124)과 값 동등, parity 테스트가 고정.
 * Figma 14094:4469의 "닉네임"·"가입일 · 이메일 :"은 플레이스홀더고 여기 값이 폴백의 출처다.
 *
 * [MSG-426] 닉네임·이메일·가입일·프로필이미지는 `GET /api/users/me`가 정본이 됐다
 * (결정 E2). 이 mock은 그 조회의 **로딩·실패 폴백**으로만 남는다 — 화면이 조회에 잠기면
 * 안 되기 때문이다.
 * [MSG-564] 스트릭·수집률이 `use-activity-query`로 실연동되며 `streakDays`·`collectionRate`를
 * 제거했다(소비처 0) — 계약이 `ProfileIdentity`로 줄었다.
 */
export const MOCK_PROFILE: ProfileIdentity = {
  nickname: "필맵퍼",
  email: "fillmapper@fillmap.app",
  // 미설정(null) — 웹 MOCK_PROFILE(MSG-378) 미러
  profileImageUrl: null,
  joinedAt: "2026-01-12",
};
