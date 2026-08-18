import { useSyncExternalStore } from "react";
import type { AuthPersistence } from "../../../shared/token-storage";

/**
 * 인증 스토어 (AC 5·7) — 웹 auth-store 이식 + 앱 규약(refreshToken·deviceId) 확장.
 *
 * apps/mobile에는 zustand가 없어(search-store·profile-store 선례) 모듈 스코프 팩토리 +
 * useSyncExternalStore 구독 훅으로 구현한다. 영속화는 zustand persist 대신 저장소 포트
 * (`AuthPersistence`)를 주입받아 직접 수행한다 — expo-secure-store가 비동기라 재수화가
 * 항상 비동기이고, 그 경계를 `hydrated`로 화면에 노출한다.
 *
 * 라우터·네이티브 모듈을 참조하지 않는다 (RN 경계 — 순수 모델).
 */

export interface AuthSnapshot {
  accessToken: string | null;
  refreshToken: string | null;
  deviceId: string | null;
  /** 토큰 보유에서 유도 — 저장 세션이 없는 새 실행은 비로그인으로 시작한다 */
  isAuthenticated: boolean;
  /** 보안 저장소 재수화 완료 여부 — false면 "아직 모른다"(로그인 여부 판정 전) */
  hydrated: boolean;
}

export interface AuthStore {
  getState: () => AuthSnapshot;
  subscribe: (listener: () => void) => () => void;
  /**
   * 현재 세션 세대 — 로그아웃(= 세션 만료 처리 포함)마다 증가한다.
   * 오래 걸리는 재발급의 시작 시점 세대를 캡처해 두고 완료 시점에 대조하는 용도다.
   * 세대가 다르면 그 발급분은 이미 끝난 세션의 것이므로 적용하면 안 된다.
   */
  getSessionGeneration: () => number;
  /** 앱 부트 시 1회 — 저장된 토큰·기기 식별자를 읽어 상태를 복원한다 */
  hydrate: () => Promise<void>;
  /**
   * 로그인·재발급 성공 — refreshToken이 null이면 기존 값을 유지한다.
   * `sessionGeneration`을 주면 그 세대가 아직 유효할 때만 적용한다(아니면 상태·저장소를
   * 모두 건드리지 않는다). 저장 실패는 삼키지 않고 호출자에게 전파한다 — 회전된
   * refreshToken이 디스크에 남지 않은 재발급은 성공이 아니다.
   */
  setTokens: (
    tokens: {
      accessToken: string;
      refreshToken: string | null;
    },
    sessionGeneration?: number,
  ) => Promise<void>;
  /** 로그인 응답 헤더의 기기 식별자 저장 */
  setDeviceId: (deviceId: string) => Promise<void>;
  /** 로컬 세션 종료 — 토큰만 비운다. deviceId는 기기에 묶인 값이라 유지 */
  logout: () => Promise<void>;
}

const initialState: AuthSnapshot = {
  accessToken: null,
  refreshToken: null,
  deviceId: null,
  isAuthenticated: false,
  hydrated: false,
};

/** 스토어 팩토리 — 테스트는 격리 인스턴스를, 앱은 auth-session의 단일 인스턴스를 쓴다 */
export const createAuthStore = (persistence: AuthPersistence): AuthStore => {
  let state: AuthSnapshot = initialState;
  /** 로그아웃마다 증가 — 진행 중이던 발급분의 유효성 판정 키 */
  let sessionGeneration = 0;
  const listeners = new Set<() => void>();

  const setState = (next: Omit<AuthSnapshot, "isAuthenticated">) => {
    state = { ...next, isAuthenticated: next.accessToken !== null };
    listeners.forEach((listener) => listener());
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSessionGeneration: () => sessionGeneration,
    hydrate: async () => {
      const stored = await persistence.load();
      setState({ ...stored, hydrated: true });
    },
    setTokens: async ({ accessToken, refreshToken }, expectedGeneration) => {
      const isStale = () =>
        expectedGeneration !== undefined &&
        expectedGeneration !== sessionGeneration;
      if (isStale()) return; // 이미 끝난 세션의 발급분 — 저장도 상태 반영도 하지 않는다
      await persistence.saveTokens({ accessToken, refreshToken });
      if (isStale()) {
        // 쓰기가 진행되는 동안 로그아웃이 끼어들었다 — 디스크에 남은 죽은 세션을 회수한다
        await persistence.clearTokens();
        return;
      }
      setState({
        ...state,
        accessToken,
        refreshToken: refreshToken ?? state.refreshToken,
      });
    },
    setDeviceId: async (deviceId) => {
      setState({ ...state, deviceId });
      await persistence.saveDeviceId(deviceId);
    },
    logout: async () => {
      // 세대를 먼저 올린다(동기) — 이 시점 이후 완료되는 발급분은 전부 무효다
      sessionGeneration += 1;
      setState({ ...state, accessToken: null, refreshToken: null });
      await persistence.clearTokens();
    },
  };
};

/** 인증 상태 구독 훅 — 화면이 로그인 여부·재수화 완료를 읽는다 */
export const useAuthSnapshot = (store: AuthStore): AuthSnapshot =>
  useSyncExternalStore(store.subscribe, store.getState);
