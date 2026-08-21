import { ProfileScreen } from "../../features/profile/ui/profile-screen";

/**
 * 프로필/설정 라우트 (MSG-306) — 스텁을 실화면으로 교체.
 * profile.tsx → profile/index.tsx 전환이어도 pathname은 "/profile" 유지 —
 * AppBottomNav TAB_ROUTES 활성 매칭 불변 (AC 1, 스펙 리스크 3).
 */
export default function Profile() {
  return <ProfileScreen />;
}
