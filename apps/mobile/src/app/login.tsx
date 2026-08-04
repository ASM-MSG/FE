import { LoginScreen } from "../features/auth/ui/login-screen";

/**
 * /login 라우트 (MSG-293) — 얇은 라우트 파일, 화면 본체는 features/auth에 위임.
 * 진입 연결 없음(승인 확정 — 라우트만 신설), 검증은 딥링크 직접 진입.
 */
export default function Login() {
  return <LoginScreen />;
}
