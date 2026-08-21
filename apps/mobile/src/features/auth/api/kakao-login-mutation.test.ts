import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 카카오 로그인 mutation 계약 (기준 4·5·6).
 * RN 렌더 인프라가 없어 훅 대신 **훅이 그대로 넘기는 옵션 객체**를 MutationObserver로
 * 구동한다(delete-account-mutation.test 선례). 네이티브 SDK·보안 저장소·라우터는 전부
 * 옵션 인자로 주입되므로 테스트가 그 모듈들을 로드하지 않는다.
 */

const API_BASE = "https://api.test.local";
const ID_TOKEN = "kakao-id-token";
const TOKENS = { accessToken: "at-1", refreshToken: "rt-1" };
const DEVICE_ID = "device-9";

const loadKakaoLogin = async (
  overrides: { requestIdToken?: () => Promise<string | undefined> } = {},
) => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { kakaoLoginMutationOptions } = await import("./kakao-login-mutation");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const requestIdToken =
    overrides.requestIdToken ?? vi.fn(async () => ID_TOKEN);
  const setTokens = vi.fn(async () => {});
  const setDeviceId = vi.fn(async () => {});
  const onLoggedIn = vi.fn();
  const observer = new MutationObserver(
    queryClient,
    kakaoLoginMutationOptions({
      queryClient,
      requestIdToken,
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

describe("카카오 로그인 mutation (기준 4·5·6)", () => {
  it("ID 토큰을 POST /api/auth/oauth/kakao로 보낸다 — 앱 규약(X-Client-Type: app) (기준 4)", async () => {
    const { observer } = await loadKakaoLogin();
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
      await loadKakaoLogin();
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
    const { observer, setDeviceId, onLoggedIn } = await loadKakaoLogin();
    stubFetch(() => loginResponse(null));

    await observer.mutate();

    expect(setDeviceId).not.toHaveBeenCalled();
    expect(onLoggedIn).toHaveBeenCalledTimes(1);
  });

  it("SDK가 ID 토큰을 주지 않으면 서버를 호출하지 않고 설정 오류로 실패한다 (기준 5)", async () => {
    const { observer, setTokens, onLoggedIn } = await loadKakaoLogin({
      requestIdToken: async () => undefined,
    });
    const received = stubFetch(() => loginResponse());
    const { resolveKakaoLoginReason } =
      await import("../model/kakao-login-failure");

    await expect(observer.mutate()).rejects.toMatchObject({
      code: "MissingIdToken",
    });

    expect(received).toEqual([]);
    expect(setTokens).not.toHaveBeenCalled();
    expect(onLoggedIn).not.toHaveBeenCalled();
    expect(resolveKakaoLoginReason(observer.getCurrentResult().error)).toBe(
      "misconfigured",
    );
  });

  it("사용자 취소는 토큰 저장·이동을 일으키지 않고 안내 문구도 없다 (기준 6)", async () => {
    const { observer, setTokens, onLoggedIn } = await loadKakaoLogin({
      requestIdToken: async () => {
        throw Object.assign(new Error("cancelled"), { code: "Cancelled" });
      },
    });
    const received = stubFetch(() => loginResponse());
    const { kakaoLoginNotice, resolveKakaoLoginReason } =
      await import("../model/kakao-login-failure");

    await expect(observer.mutate()).rejects.toThrow();

    expect(received).toEqual([]);
    expect(setTokens).not.toHaveBeenCalled();
    expect(onLoggedIn).not.toHaveBeenCalled();
    const error = observer.getCurrentResult().error;
    expect(resolveKakaoLoginReason(error)).toBe("cancelled");
    expect(kakaoLoginNotice(resolveKakaoLoginReason(error))).toBeNull();
  });
});
