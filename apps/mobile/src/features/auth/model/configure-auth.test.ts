import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "../../../test/envelope-response";
import type {
  AuthPersistence,
  StoredAuth,
} from "../../../shared/token-storage";

/**
 * 파이프라인↔스토어 배선 계약 (AC 7·8) — 세션 만료 시 "토큰 클리어 + 로그인 화면 이동"이
 * 실제 401 흐름에서 성립하는지, 익명 401에서는 아무 일도 일어나지 않는지를 고정한다.
 * 로그인 이동은 콜백으로 주입받는다 — 모델이 expo-router를 직접 import하지 않는다(RN 경계).
 *
 * 세션 세대 블록(맨 아래)은 codex 리뷰가 잡은 결함을 고정한다: 재발급이 in-flight인 동안
 * 로그아웃/재로그인이 일어나면 늦게 도착한 발급분이 죽은 세션을 되살리면 안 된다.
 */

const API_BASE = "https://api.test.local";

const unauthorizedResponse = () =>
  new Response(
    JSON.stringify({
      developCode: 2403,
      message: "인증이 필요합니다",
      data: null,
    }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );

/** 비동기 경계를 테스트가 직접 여닫기 위한 최소 deferred */
const deferred = () => {
  let release: () => void = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release: () => release() };
};

/** 토큰 쓰기 시점에 테스트가 개입할 수 있는 훅 (지연·실패 주입) */
type PersistenceHooks = { beforeSaveTokens?: () => Promise<void> | void };

const fakePersistence = (
  initial: Partial<StoredAuth> = {},
  hooks: PersistenceHooks = {},
) => {
  const stored: StoredAuth = {
    accessToken: initial.accessToken ?? null,
    refreshToken: initial.refreshToken ?? null,
    deviceId: initial.deviceId ?? null,
  };
  const persistence: AuthPersistence = {
    load: async () => ({ ...stored }),
    saveTokens: async (tokens) => {
      await hooks.beforeSaveTokens?.();
      stored.accessToken = tokens.accessToken;
      if (tokens.refreshToken !== null)
        stored.refreshToken = tokens.refreshToken;
    },
    saveDeviceId: async (deviceId) => {
      stored.deviceId = deviceId;
    },
    clearTokens: async () => {
      stored.accessToken = null;
      stored.refreshToken = null;
    },
  };
  return { persistence, stored };
};

const loadWiring = async (
  initial: Partial<StoredAuth>,
  hooks: PersistenceHooks = {},
) => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { createAuthStore } = await import("./auth-store");
  const { setupAuthPipeline } = await import("./configure-auth");
  const { httpClient } = await import("../../../shared/api/http-client");
  const { persistence, stored } = fakePersistence(initial, hooks);
  const store = createAuthStore(persistence);
  await store.hydrate();
  const goToLogin = vi.fn();
  setupAuthPipeline({ store, goToLogin });
  return { store, stored, goToLogin, httpClient };
};

/** 재발급 응답을 테스트가 원하는 시점에 내보내는 fetch 목 — 401 → reissue 흐름 전용 */
const stubReissueFetch = (options: { gate?: Promise<void> } = {}) => {
  const paths: string[] = [];
  const started = deferred();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const { pathname } = new URL(request.url);
      paths.push(pathname);
      if (pathname !== "/api/auth/reissue") return unauthorizedResponse();
      started.release();
      if (options.gate !== undefined) await options.gate;
      return envelopeResponse({
        accessToken: "reissued-token",
        refreshToken: "rotated-refresh",
      });
    }),
  );
  return { paths, reissueStarted: started.promise };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("세션 만료 처리 (AC 7)", () => {
  it("재발급 실패 시 저장 토큰을 비우고 로그인 화면 이동 어댑터를 호출한다", async () => {
    const { store, goToLogin, httpClient } = await loadWiring({
      accessToken: "stale-access",
      refreshToken: "expired-refresh",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => unauthorizedResponse()),
    );

    const response = await httpClient.get(`${API_BASE}/api/videos`);

    expect(response.status).toBe(401);
    expect(store.getState().accessToken).toBeNull();
    expect(store.getState().refreshToken).toBeNull();
    expect(store.getState().isAuthenticated).toBe(false);
    expect(goToLogin).toHaveBeenCalledTimes(1);
  });
});

describe("세션 세대 — 늦게 도착한 재발급 폐기 (AC 6·7 회귀)", () => {
  it("재발급 진행 중 로그아웃하면 늦게 성공한 발급이 인증 상태를 되살리지 않고 저장소에도 다시 쓰지 않는다", async () => {
    const { store, stored, goToLogin, httpClient } = await loadWiring({
      accessToken: "stale-access",
      refreshToken: "stored-refresh",
    });
    const gate = deferred();
    const { paths, reissueStarted } = stubReissueFetch({ gate: gate.promise });

    const pending = httpClient.get(`${API_BASE}/api/videos`);
    await reissueStarted;
    await store.logout();
    gate.release();
    const response = await pending;

    expect(response.status).toBe(401);
    expect(store.getState().accessToken).toBeNull();
    expect(store.getState().refreshToken).toBeNull();
    expect(store.getState().isAuthenticated).toBe(false);
    expect(stored.accessToken).toBeNull();
    expect(stored.refreshToken).toBeNull();
    // 죽은 세션의 토큰으로 원 요청을 재시도하지 않는다
    expect(paths).toEqual(["/api/videos", "/api/auth/reissue"]);
    // 사용자가 스스로 로그아웃한 것이므로 세션 만료 처리(로그인 이동)도 아니다
    expect(goToLogin).not.toHaveBeenCalled();
  });

  it("로그아웃 후 다른 계정으로 재로그인했으면 옛 재발급분이 새 세션에 적용되지 않는다", async () => {
    const { store, stored, goToLogin, httpClient } = await loadWiring({
      accessToken: "stale-access",
      refreshToken: "stored-refresh",
    });
    const gate = deferred();
    const { paths, reissueStarted } = stubReissueFetch({ gate: gate.promise });

    const pending = httpClient.get(`${API_BASE}/api/videos`);
    await reissueStarted;
    await store.logout();
    await store.setTokens({
      accessToken: "other-account-access",
      refreshToken: "other-account-refresh",
    });
    gate.release();
    await pending;

    expect(store.getState().accessToken).toBe("other-account-access");
    expect(store.getState().refreshToken).toBe("other-account-refresh");
    expect(stored.accessToken).toBe("other-account-access");
    expect(stored.refreshToken).toBe("other-account-refresh");
    expect(paths).toEqual(["/api/videos", "/api/auth/reissue"]);
    expect(goToLogin).not.toHaveBeenCalled();
  });

  it("토큰 쓰기 도중 로그아웃이 끼어들어도 죽은 세션이 저장소에 남지 않는다", async () => {
    const gate = deferred();
    const saveStarted = deferred();
    const { store, stored, httpClient } = await loadWiring(
      { accessToken: "stale-access", refreshToken: "stored-refresh" },
      {
        beforeSaveTokens: async () => {
          saveStarted.release();
          await gate.promise;
        },
      },
    );
    const { paths } = stubReissueFetch();

    const pending = httpClient.get(`${API_BASE}/api/videos`);
    await saveStarted.promise;
    await store.logout();
    gate.release();
    await pending;

    expect(stored.accessToken).toBeNull();
    expect(stored.refreshToken).toBeNull();
    expect(store.getState().isAuthenticated).toBe(false);
    expect(paths).toEqual(["/api/videos", "/api/auth/reissue"]);
  });

  it("회전 토큰 영속화가 실패하면 재발급을 실패로 처리해 새 토큰으로 재시도하지 않는다", async () => {
    const { store, goToLogin, httpClient } = await loadWiring(
      { accessToken: "stale-access", refreshToken: "stored-refresh" },
      {
        beforeSaveTokens: () => {
          throw new Error("secure store write failed");
        },
      },
    );
    const { paths } = stubReissueFetch();

    const response = await httpClient.get(`${API_BASE}/api/videos`);

    // 회전된 refreshToken이 디스크에 남지 않았으므로 세션은 이미 끊긴 것으로 취급한다
    expect(paths).toEqual(["/api/videos", "/api/auth/reissue"]);
    expect(response.status).toBe(401);
    expect(goToLogin).toHaveBeenCalledTimes(1);
    expect(store.getState().isAuthenticated).toBe(false);
  });
});

describe("익명 401 무개입 (AC 8)", () => {
  it("저장 refreshToken이 없으면 로그인 화면으로 보내지 않는다", async () => {
    const { store, goToLogin, httpClient } = await loadWiring({});
    const fetchMock = vi.fn(async () => unauthorizedResponse());
    vi.stubGlobal("fetch", fetchMock);

    const response = await httpClient.get(`${API_BASE}/api/cells`);

    expect(response.status).toBe(401);
    // 재발급 요청조차 나가지 않는다
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(goToLogin).not.toHaveBeenCalled();
    expect(store.getState().isAuthenticated).toBe(false);
  });
});
