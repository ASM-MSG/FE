import { useEffect } from "react";
import { AiRouteScreen } from "../features/ai-route/ui/ai-route-screen";
import { useAuth } from "../features/auth/model/auth-session";
import { goToLogin } from "../shared/navigation";

/**
 * AI 경로 추천 라우트 (MSG-556) — 바텀 탭 `AI 추천`.
 * 로그인 전용이다 (D5, 웹 `RequireAuth` 대응 — 서버가 익명 POST를 401(2403)로 막는다):
 * 재수화가 끝나고 비로그인이면 로그인 화면으로 보내고 화면을 렌더하지 않는다.
 * 재수화 전(`hydrated=false`)은 판정을 미룬다(`useOccupiedGridsQuery`의 `settled` 관례).
 * 세션 중 401은 mutation의 `onLoginRequired`가 2차로 막는다 (§1-4).
 */
export default function AiRoute() {
  const { isAuthenticated, hydrated } = useAuth();

  useEffect(() => {
    if (hydrated && !isAuthenticated) goToLogin();
  }, [hydrated, isAuthenticated]);

  if (!hydrated || !isAuthenticated) return null;
  return <AiRouteScreen />;
}
