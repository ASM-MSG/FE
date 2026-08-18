import { describe, expect, it, vi } from "vitest";
import type {
  AuthPersistence,
  StoredAuth,
} from "../../../shared/token-storage";
import { createAuthStore } from "./auth-store";

/**
 * 모바일 인증 스토어 (AC 5·7) — 웹 auth-store 이식 + refreshToken·deviceId 필드.
 * 보안 저장소(expo-secure-store)는 어댑터 포트로 주입받는다(RN 경계 — 네이티브 모듈이
 * 모델에 들어오면 순수 모델 테스트가 불가능해진다). 여기서는 인메모리 가짜로 검증한다.
 */

const fakePersistence = (initial: Partial<StoredAuth> = {}) => {
  const stored: StoredAuth = {
    accessToken: initial.accessToken ?? null,
    refreshToken: initial.refreshToken ?? null,
    deviceId: initial.deviceId ?? null,
  };
  const persistence: AuthPersistence = {
    load: vi.fn(async () => ({ ...stored })),
    saveTokens: vi.fn(async (tokens) => {
      stored.accessToken = tokens.accessToken;
      if (tokens.refreshToken !== null)
        stored.refreshToken = tokens.refreshToken;
    }),
    saveDeviceId: vi.fn(async (deviceId) => {
      stored.deviceId = deviceId;
    }),
    clearTokens: vi.fn(async () => {
      stored.accessToken = null;
      stored.refreshToken = null;
    }),
  };
  return { persistence, stored };
};

describe("초기 상태·재수화 (AC 5)", () => {
  it("재수화 전에는 비로그인이고 hydrated가 false다 — 재수화 게이트의 근거", () => {
    const { persistence } = fakePersistence({ accessToken: "saved-access" });
    const store = createAuthStore(persistence);

    expect(store.getState()).toEqual({
      accessToken: null,
      refreshToken: null,
      deviceId: null,
      isAuthenticated: false,
      hydrated: false,
    });
  });

  it("앱 재시작(새 스토어 로드) 후 hydrate하면 저장된 토큰으로 인증 상태가 복원된다", async () => {
    const { persistence } = fakePersistence({
      accessToken: "saved-access",
      refreshToken: "saved-refresh",
      deviceId: "device-abc",
    });
    const store = createAuthStore(persistence);

    await store.hydrate();

    expect(store.getState()).toEqual({
      accessToken: "saved-access",
      refreshToken: "saved-refresh",
      deviceId: "device-abc",
      isAuthenticated: true,
      hydrated: true,
    });
  });

  it("저장된 토큰이 없으면 재수화 후에도 비로그인으로 시작한다", async () => {
    const { persistence } = fakePersistence();
    const store = createAuthStore(persistence);

    await store.hydrate();

    expect(store.getState().isAuthenticated).toBe(false);
    expect(store.getState().hydrated).toBe(true);
  });
});

describe("토큰 저장 (AC 5·6)", () => {
  it("로그인 성공 시 액세스·리프레시 토큰이 보안 저장소 어댑터로 영속화된다", async () => {
    const { persistence, stored } = fakePersistence();
    const store = createAuthStore(persistence);

    await store.setTokens({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });

    expect(store.getState().accessToken).toBe("new-access");
    expect(store.getState().isAuthenticated).toBe(true);
    expect(stored).toMatchObject({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
  });

  it("재발급 응답의 refreshToken이 null이면 기존 리프레시 토큰을 유지한다", async () => {
    const { persistence } = fakePersistence({
      accessToken: "old-access",
      refreshToken: "kept-refresh",
    });
    const store = createAuthStore(persistence);
    await store.hydrate();

    await store.setTokens({ accessToken: "reissued", refreshToken: null });

    expect(store.getState().accessToken).toBe("reissued");
    expect(store.getState().refreshToken).toBe("kept-refresh");
  });

  it("로그인 응답 헤더의 디바이스 식별자를 저장한다", async () => {
    const { persistence, stored } = fakePersistence();
    const store = createAuthStore(persistence);

    await store.setDeviceId("device-xyz");

    expect(store.getState().deviceId).toBe("device-xyz");
    expect(stored.deviceId).toBe("device-xyz");
  });
});

describe("세션 종료 (AC 7)", () => {
  it("logout은 상태와 저장소의 토큰을 모두 비운다 — deviceId는 기기 값이라 유지된다", async () => {
    const { persistence, stored } = fakePersistence({
      accessToken: "a",
      refreshToken: "r",
      deviceId: "device-abc",
    });
    const store = createAuthStore(persistence);
    await store.hydrate();

    await store.logout();

    expect(store.getState()).toMatchObject({
      accessToken: null,
      refreshToken: null,
      deviceId: "device-abc",
      isAuthenticated: false,
    });
    expect(stored.accessToken).toBeNull();
    expect(stored.refreshToken).toBeNull();
  });
});

describe("구독 (화면 반영)", () => {
  it("상태가 바뀌면 구독자에게 통지한다", async () => {
    const { persistence } = fakePersistence();
    const store = createAuthStore(persistence);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    await store.setTokens({ accessToken: "a", refreshToken: "r" });
    unsubscribe();
    await store.logout();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
