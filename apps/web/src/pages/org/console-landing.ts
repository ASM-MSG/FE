import { CONSOLE_ROUTES } from "@/app/console-routes";
import type { SessionRole } from "@/features/auth/api/use-session-role";

/**
 * role별 콘솔 착지 경로 (MSG-542 AC 2·7) — 없으면 null(= 콘솔 이용 권한 없음, 폼 안내).
 *
 * 로그인 성공(응답 role)과 첫 비밀번호 설정 성공(세션 role) 두 곳이 공유한다 —
 * 같은 분기를 두 페이지에 복제하면 한쪽만 고쳐지는 착지 드리프트가 난다.
 * MSG-541 추정 4가 위임한 분기점이며, ADMIN 홈 화면이 없어 심사 큐가 기본 착지다.
 *
 * 로그인 응답의 role은 **착지 판정 1회용**으로만 쓰고 persist하지 않는다 —
 * 세션 role의 정본은 getMe다(MSG-541 추정 1).
 */
export const consoleLandingPath = (role: SessionRole | null): string | null => {
  if (role === "ORG") return CONSOLE_ROUTES.orgHome;
  if (role === "ADMIN") return CONSOLE_ROUTES.adminReview;
  return null;
};
