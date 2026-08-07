import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { webStorage } from "@/shared/storage";

interface AuthState {
  /** 저장된 JWT 액세스 토큰 — null이면 비로그인 (MSG-324 실인증 전환) */
  accessToken: string | null;
  /**
   * 로그인 여부 — 토큰 보유 여부에서 유도된다 (기본 true 목 제거, MSG-324 기준 10).
   * 기존 소비처(RequireAuth·SideRailNav 등)의 불리언 셀렉터 계약 유지용 상태 필드로,
   * 액션·재수화 merge가 항상 accessToken과 동기화한다.
   */
  isAuthenticated: boolean;
  /** 로그인 계열 훅 성공 시 액세스 토큰 저장 — 리프레시 토큰은 HttpOnly 쿠키라 비저장 */
  setAccessToken: (accessToken: string) => void;
  /** 로컬 세션 종료 — 토큰·인증 상태만 비운다. logout API 호출은 useLogout 훅 소관 */
  logout: () => void;
}

/** 영속화 키 — 테스트가 새 로드(재수화) 의미론을 검증할 때 스토리지 초기화에 사용 */
export const AUTH_STORAGE_KEY = "fillmap-auth";

/** persist에 싣는 부분 상태 — isAuthenticated는 유도값이라 저장하지 않는다 */
type PersistedAuthState = { accessToken: string | null };

/**
 * 인증 스토어 팩토리 (MSG-324 — MSG-46 후속 목 스토어를 실토큰 중심으로 개편).
 * 액세스 토큰만 shared/storage 어댑터 경유로 영속화하고(RN 경계 — RN에서는 어댑터만
 * 교체), isAuthenticated는 토큰 유무에서 유도한다 — 저장 세션이 없는 새 로드는
 * 비로그인으로 시작한다(구 "데모 기본값 true" 제거, 티켓 명시 요구).
 * version 1: 구 shape({isAuthenticated})는 실토큰이 없으므로 migrate에서 폐기(추정 5).
 * 라우터를 참조하지 않는다(RN 경계). 팩토리 export는 테스트의 "새 로드 = 새 스토어
 * 생성 시 재수화" 재현용 — 앱은 아래 useAuthStore 싱글턴만 사용한다.
 */
export const createAuthStore = () =>
  create<AuthState>()(
    persist(
      (set) => ({
        accessToken: null,
        isAuthenticated: false,
        setAccessToken: (accessToken) =>
          set({ accessToken, isAuthenticated: true }),
        logout: () => set({ accessToken: null, isAuthenticated: false }),
      }),
      {
        name: AUTH_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => webStorage),
        partialize: (state): PersistedAuthState => ({
          accessToken: state.accessToken,
        }),
        // 구 버전(0) 스토리지는 토큰 없는 인증 플래그뿐 — 인증으로 인정하지 않고 폐기
        migrate: (): PersistedAuthState => ({ accessToken: null }),
        merge: (persisted, current) => {
          const accessToken =
            (persisted as PersistedAuthState | undefined)?.accessToken ?? null;
          return {
            ...current,
            accessToken,
            isAuthenticated: accessToken !== null,
          };
        },
      },
    ),
  );

export const useAuthStore = createAuthStore();
