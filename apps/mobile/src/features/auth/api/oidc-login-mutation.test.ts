import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OidcCredential, SocialProvider } from "./oidc-login-mutation";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 소셜(OIDC) 로그인 mutation 계약
 * (MSG-444 기준 4·5·6 → MSG-601 L3·L4·L5로 provider 매개화).
 * RN 렌더 인프라가 없어 훅 대신 **훅이 그대로 넘기는 옵션 객체**를 MutationObserver로
 * 구동한다(delete-account-mutation.test 선례). 네이티브 SDK·보안 저장소·라우터는 전부
 * 옵션 인자로 주입되므로 테스트가 그 모듈들을 로드하지 않는다.
 * 카카오 5케이스는 MSG-444 그대로다(deps 형태만 `requestCredential`) — 옵션 팩토리가 하나라
 * 애플을 얹어도 카카오 body `{ idToken }` 단정이 그대로 통과해야 한다(L5).
 */

const API_BASE = "https://api.test.local";
const ID_TOKEN = "kakao-id-token";
const APPLE_ID_TOKEN = "apple-identity-token";
const APPLE_NONCE = "a".repeat(64);
const APPLE_AUTH_CODE = "c0de";
const TOKENS = { accessToken: "at-1", refreshToken: "rt-1" };
const DEVICE_ID = "device-9";

const loadOidcLogin = async (
  overrides: {
    provider?: SocialProvider;
    requestCredential?: () => Promise<OidcCredential>;
  } = {},
) => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { oidcLoginMutationOptions } = await import("./oidc-login-mutation");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const requestCredential =
    overrides.requestCredential ?? vi.fn(async () => ({ idToken: ID_TOKEN }));
  const setTokens = vi.fn(async () => {});
  const setDeviceId = vi.fn(async () => {});
  const onLoggedIn = vi.fn();
  const observer = new MutationObserver(
    queryClient,
    oidcLoginMutationOptions({
      provider: overrides.provider ?? "kakao",
      queryClient,
      requestCredential,
      setTokens,
      setDeviceId,
      onLoggedIn,
    }),
  );
  return { queryClient, observer, setTokens, setDeviceId, onLoggedIn };
};

const stubFetch = (
  route: (request: Request) => Response | Promise<Response>,
) => {
  const received: Array<{
    method: string;
    pathname: string;
    body: unknown;
    clientType: string | null;
  }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      received.push({
        method: input.method,
        pathname: new URL(input.url).pathname,
        body: await input.clone().json(),
        clientType: input.headers.get("X-Client-Type"),
      });
      return route(input);
    }),
  );
  return received;
};

/** 로그인 성공 응답 — 기기 식별자는 body가 아니라 응답 **헤더**로 온다 */
const loginResponse = (deviceId: string | null = DEVICE_ID) =>
  new Response(
    JSON.stringify({ developCode: 0, message: "ok", data: TOKENS }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...(deviceId === null ? {} : { "X-Device-Id": deviceId }),
      },
    },
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("카카오 로그인 mutation (MSG-444 기준 4·5·6 — 불변)", () => {
  it("ID 토큰을 POST /api/auth/oauth/kakao로 보낸다 — 앱 규약(X-Client-Type: app) (기준 4)", async () => {
    const { observer } = await loadOidcLogin();
    const received = stubFetch(() => loginResponse());

    await observer.mutate();

    expect(received).toEqual([
      {
        method: "POST",
        pathname: "/api/auth/oauth/kakao",
        body: { idToken: ID_TOKEN },
        clientType: "app",
      },
    ]);
  });

  it("성공하면 토큰 저장 → 기기 식별자 저장 → 세션 캐시 정리 → 이동 순으로 처리한다 (기준 4)", async () => {
    const { observer, queryClient, setTokens, setDeviceId, onLoggedIn } =
      await loadOidcLogin();
    queryClient.setQueryData(["previous-user"], { nickname: "이전 사용자" });
    stubFetch(() => loginResponse());

    await observer.mutate();

    expect(setTokens).toHaveBeenCalledWith(TOKENS);
    expect(setDeviceId).toHaveBeenCalledWith(DEVICE_ID);
    expect(onLoggedIn).toHaveBeenCalledTimes(1);
    // 이전 세션 데이터가 다음 사용자에게 새지 않는다 (MSG-422 P0 환류 — clear가 아니라 reset)
    expect(queryClient.getQueryData(["previous-user"])).toBeUndefined();
    expect(setTokens.mock.invocationCallOrder[0]).toBeLessThan(
      setDeviceId.mock.invocationCallOrder[0],
    );
    expect(setDeviceId.mock.invocationCallOrder[0]).toBeLessThan(
      onLoggedIn.mock.invocationCallOrder[0],
    );
  });

  it("응답에 기기 식별자 헤더가 없으면 저장하지 않고 로그인은 완료된다 (기준 4)", async () => {
    const { observer, setDeviceId, onLoggedIn } = await loadOidcLogin();
    stubFetch(() => loginResponse(null));

    await observer.mutate();

    expect(setDeviceId).not.toHaveBeenCalled();
    expect(onLoggedIn).toHaveBeenCalledTimes(1);
  });

  it("SDK가 ID 토큰을 주지 않으면 서버를 호출하지 않고 설정 오류로 실패한다 (기준 5)", async () => {
    const { observer, setTokens, onLoggedIn } = await loadOidcLogin({
      requestCredential: async () => ({ idToken: undefined }),
    });
    const received = stubFetch(() => loginResponse());
    const { resolveSocialLoginReason } =
      await import("../model/social-login-failure");

    await expect(observer.mutate()).rejects.toMatchObject({
      code: "MissingIdToken",
    });

    expect(received).toEqual([]);
    expect(setTokens).not.toHaveBeenCalled();
    expect(onLoggedIn).not.toHaveBeenCalled();
    expect(resolveSocialLoginReason(observer.getCurrentResult().error)).toBe(
      "misconfigured",
    );
  });

  it("사용자 취소는 토큰 저장·이동을 일으키지 않고 안내 문구도 없다 (기준 6)", async () => {
    const { observer, setTokens, onLoggedIn } = await loadOidcLogin({
      requestCredential: async () => {
        throw Object.assign(new Error("cancelled"), { code: "Cancelled" });
      },
    });
    const received = stubFetch(() => loginResponse());
    const { socialLoginNotice, resolveSocialLoginReason } =
      await import("../model/social-login-failure");

    await expect(observer.mutate()).rejects.toThrow();

    expect(received).toEqual([]);
    expect(setTokens).not.toHaveBeenCalled();
    expect(onLoggedIn).not.toHaveBeenCalled();
    const error = observer.getCurrentResult().error;
    expect(resolveSocialLoginReason(error)).toBe("cancelled");
    expect(socialLoginNotice(resolveSocialLoginReason(error), "kakao")).toBe(
      null,
    );
  });
});

describe("애플 로그인 mutation (MSG-601 L3·L4·L5)", () => {
  const appleCredential = (fullName?: string): OidcCredential => ({
    idToken: APPLE_ID_TOKEN,
    nonce: APPLE_NONCE,
    authorizationCode: APPLE_AUTH_CODE,
    fullName,
  });

  it("어댑터가 준 자격을 POST /api/auth/oauth/apple에 { idToken, nonce 원문, authorizationCode, fullName } + X-Client-Type: app으로 보낸다 (L3)", async () => {
    const { observer } = await loadOidcLogin({
      provider: "apple",
      requestCredential: async () => appleCredential("김필맵"),
    });
    const received = stubFetch(() => loginResponse());

    await observer.mutate();

    expect(received).toEqual([
      {
        method: "POST",
        pathname: "/api/auth/oauth/apple",
        body: {
          idToken: APPLE_ID_TOKEN,
          nonce: APPLE_NONCE,
          authorizationCode: APPLE_AUTH_CODE,
          fullName: "김필맵",
        },
        clientType: "app",
      },
    ]);
  });

  it("fullName이 없는 재승인에서도 authorizationCode는 항상 실린다 — 첫 로그인인지 가리지 않는다 (L3, BE 계약 3항)", async () => {
    const { observer } = await loadOidcLogin({
      provider: "apple",
      requestCredential: async () => appleCredential(undefined),
    });
    const received = stubFetch(() => loginResponse());

    await observer.mutate();

    expect(received[0]?.body).toEqual({
      idToken: APPLE_ID_TOKEN,
      nonce: APPLE_NONCE,
      authorizationCode: APPLE_AUTH_CODE,
    });
  });

  it("identityToken이 null이면 서버를 호출하지 않고 MissingIdToken(설정 오류)으로 실패한다 (L4)", async () => {
    const { observer, setTokens, onLoggedIn } = await loadOidcLogin({
      provider: "apple",
      requestCredential: async () => ({
        idToken: null,
        nonce: APPLE_NONCE,
        authorizationCode: APPLE_AUTH_CODE,
      }),
    });
    const received = stubFetch(() => loginResponse());
    const { resolveSocialLoginReason } =
      await import("../model/social-login-failure");

    await expect(observer.mutate()).rejects.toMatchObject({
      code: "MissingIdToken",
    });

    expect(received).toEqual([]);
    expect(setTokens).not.toHaveBeenCalled();
    expect(onLoggedIn).not.toHaveBeenCalled();
    expect(resolveSocialLoginReason(observer.getCurrentResult().error)).toBe(
      "misconfigured",
    );
  });

  it("성공 처리는 카카오와 동일하다 — 토큰 저장 → 기기 식별자 저장 → 세션 캐시 정리 → 이동 (L5)", async () => {
    const { observer, queryClient, setTokens, setDeviceId, onLoggedIn } =
      await loadOidcLogin({
        provider: "apple",
        requestCredential: async () => appleCredential(),
      });
    queryClient.setQueryData(["previous-user"], { nickname: "이전 사용자" });
    stubFetch(() => loginResponse());

    await observer.mutate();

    expect(setTokens).toHaveBeenCalledWith(TOKENS);
    expect(setDeviceId).toHaveBeenCalledWith(DEVICE_ID);
    expect(onLoggedIn).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(["previous-user"])).toBeUndefined();
    expect(setTokens.mock.invocationCallOrder[0]).toBeLessThan(
      setDeviceId.mock.invocationCallOrder[0],
    );
    expect(setDeviceId.mock.invocationCallOrder[0]).toBeLessThan(
      onLoggedIn.mock.invocationCallOrder[0],
    );
  });
});
