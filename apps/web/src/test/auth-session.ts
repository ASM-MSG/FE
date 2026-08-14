import { useAuthStore } from "@/features/auth/model/auth-store";

/**
 * 테스트 전용 인증 세션 헬퍼 — 보호 API 인증 게이트(MSG-328 익명 401 실측) 검증이
 * 여러 파일(쿼리 훅·패널/검색 스모크)에서 같은 setState 조작을 반복해 추출했다
 * (중복 게이트 검출). 로그인은 실제 스토어 액션과 같은 상태 모양을 만든다.
 */
export const signInForTest = () =>
  useAuthStore.setState({ accessToken: "test-token", isAuthenticated: true });

export const signOutForTest = () =>
  useAuthStore.setState({ accessToken: null, isAuthenticated: false });
