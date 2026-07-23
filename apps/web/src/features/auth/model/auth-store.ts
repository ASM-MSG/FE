import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { webStorage } from "@/shared/storage";

interface AuthState {
  /** 로그인 여부 — 목 상태. 실제 인증 아님 */
  isAuthenticated: boolean;
  /** 목 로그인 (카카오 버튼) — 실제 OAuth 아님, 상태 전환뿐 */
  login: () => void;
  logout: () => void;
}

/** 영속화 키 — 테스트가 새 로드(재수화) 의미론을 검증할 때 스토리지 초기화에 사용 */
export const AUTH_STORAGE_KEY = "fillmap-auth";

/**
 * 목 인증 스토어 팩토리 (MSG-46 후속 3 P1 — F1 "비영속" 대체).
 * 로그아웃·목 로그인이 새로고침/직접 진입(새 로드)에도 유지되도록 영속화한다 —
 * 비영속이면 R1 라우트 가드가 새 로드를 실제로 막지 못한다(codex 지적).
 * 스토리지는 shared/storage 어댑터 경유(RN 경계 — RN에서는 어댑터만 교체).
 * 저장된 세션이 없으면 로그인 상태(true)로 시작한다 — 데모 기본값.
 * 라우터를 참조하지 않는다(RN 경계). OAuth 연동 티켓에서 실인증으로 교체된다.
 * 팩토리 export는 테스트가 "새 로드 = 새 스토어 생성 시 재수화"를 재현하기 위한 것 —
 * 앱은 아래 useAuthStore 싱글턴만 사용한다.
 */
export const createAuthStore = () =>
  create<AuthState>()(
    persist(
      (set) => ({
        isAuthenticated: true,
        login: () => set({ isAuthenticated: true }),
        logout: () => set({ isAuthenticated: false }),
      }),
      {
        name: AUTH_STORAGE_KEY,
        storage: createJSONStorage(() => webStorage),
      },
    ),
  );

export const useAuthStore = createAuthStore();
