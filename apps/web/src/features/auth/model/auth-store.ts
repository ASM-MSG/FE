import { create } from "zustand";

interface AuthState {
  /** 로그인 여부 — 목(in-memory) 상태. 실제 인증 아님 */
  isAuthenticated: boolean;
  logout: () => void;
}

/**
 * 목 인증 스토어 (MSG-46 후속 F1) — 로그인 페이지·모달 UI를 실제 흐름처럼 보기 위한
 * 데모 스캐폴딩. 초기값은 로그인 상태이며 영속화하지 않는다(새로고침 시 복원 — 의도).
 * OAuth 연동 티켓에서 실인증 상태로 교체된다. 라우터를 참조하지 않는다(RN 경계).
 */
export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: true,
  logout: () => set({ isAuthenticated: false }),
}));
