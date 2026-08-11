import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deviceIdStorage, webStorage } from "@/shared/storage";
import { envelopeResponse } from "@/test/envelope-response";
import { AUTH_STORAGE_KEY, useAuthStore } from "../model/auth-store";
import {
  useDevSocialLogin,
  useEmailLogin,
  useLogout,
  useSignup,
} from "./use-auth-mutations";

/**
 * 인증 mutation 훅 (MSG-324 수용 기준 7·8·9, test-first).
 * 생성 SDK mutation 경유를 fetch 목의 URL(pathname)·메서드·바디로 검증한다 — MSW 미도입
 * (단순성 우선). 파이프라인 설정(configureAuthPipeline)은 안 한다 — 훅 계층은
 * 파이프라인 유무와 독립적으로 동작해야 한다.
 */

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

/** fetch 목 — 받은 Request와 파싱된 바디를 기록한다 */
const stubFetch = (
  route: (request: Request) => Response | Promise<Response>,
) => {
  const received: { request: Request; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      const body =
        input.method === "POST" && input.body !== null
          ? await input.clone().json()
          : undefined;
      received.push({ request: input, body });
      return route(input);
    }),
  );
  return received;
};

const pathnameOf = (request: Request) => new URL(request.url).pathname;

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, isAuthenticated: false });
  webStorage.removeItem(AUTH_STORAGE_KEY);
  deviceIdStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useDevSocialLogin (기준 7·8)", () => {
  it("성공 시 봉투가 언랩되어 accessToken이 스토어에 저장되고 isAuthenticated가 true가 된다", async () => {
    const received = stubFetch(() =>
      envelopeResponse({
        accessToken: "dev-access-token",
        refreshToken: "dev-refresh-token",
      }),
    );

    const { result } = renderHook(() => useDevSocialLogin(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 생성 SDK 경유 — dev 모의 엔드포인트로 POST, oid는 코드 상수 (질문 2 기본값)
    expect(received).toHaveLength(1);
    expect(pathnameOf(received[0].request)).toBe("/api/auth/dev/social-login");
    expect(received[0].request.method).toBe("POST");
    expect(received[0].body).toEqual({ oid: "web-local-dev" });

    expect(useAuthStore.getState().accessToken).toBe("dev-access-token");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("응답의 refreshToken은 어디에도 저장되지 않는다 — 스토어·스토리지 비저장 (기준 7)", async () => {
    stubFetch(() =>
      envelopeResponse({
        accessToken: "dev-access-token",
        refreshToken: "dev-refresh-token",
      }),
    );

    const { result } = renderHook(() => useDevSocialLogin(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(JSON.stringify(useAuthStore.getState())).not.toContain(
      "dev-refresh-token",
    );
    expect(webStorage.getItem(AUTH_STORAGE_KEY)).not.toContain(
      "dev-refresh-token",
    );
  });
});

describe("useEmailLogin (기준 7·8, MSG-352 A2·A3·A5)", () => {
  // MSG-352 개편: 변수는 이메일·비밀번호 평면 객체 — 화면(DevLoginPanel)이 SDK Options
  // 계층을 모르게 한다 (useKakaoCodeLogin 패턴). 기존 { body } 형태 테스트의 정당 갱신.
  it("성공 시 accessToken이 스토어에 저장되고 이전 세션의 쿼리 캐시가 비워진다 — /api/auth/login POST (A2)", async () => {
    const received = stubFetch(() =>
      envelopeResponse({
        accessToken: "email-access-token",
        refreshToken: null,
      }),
    );
    const queryClient = new QueryClient();
    queryClient.setQueryData(["profile"], { nickname: "이전 사용자" });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useEmailLogin(), { wrapper });
    act(() => {
      result.current.mutate({
        email: "seomyeon@fillmap.kr",
        password: "password12",
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(pathnameOf(received[0].request)).toBe("/api/auth/login");
    expect(received[0].body).toEqual({
      email: "seomyeon@fillmap.kr",
      password: "password12",
    });
    expect(useAuthStore.getState().accessToken).toBe("email-access-token");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(queryClient.getQueryData(["profile"])).toBeUndefined();
  });

  it("응답 헤더 X-Device-Id가 deviceIdStorage에 저장된다 — 이후 401 재발급 전제 (A3)", async () => {
    stubFetch(
      () =>
        new Response(
          JSON.stringify({
            developCode: 0,
            message: "ok",
            data: { accessToken: "email-access-token", refreshToken: null },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-Device-Id": "device-from-server",
            },
          },
        ),
    );

    const { result } = renderHook(() => useEmailLogin(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.mutate({
        email: "seomyeon@fillmap.kr",
        password: "password12",
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(deviceIdStorage.get()).toBe("device-from-server");
  });

  it("실패(API 오류) 시 isError로 끝나고 인증 상태를 바꾸지 않는다 (A5)", async () => {
    stubFetch(() => new Response(null, { status: 401 }));

    const { result } = renderHook(() => useEmailLogin(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.mutate({
        email: "seomyeon@fillmap.kr",
        password: "wrong-password",
      });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe("useSignup (기준 8, 추정 7)", () => {
  it("성공 시 언랩된 가입 응답을 반환하고, 자동 로그인은 하지 않는다", async () => {
    const received = stubFetch(() =>
      envelopeResponse({
        id: 1,
        email: "seomyeon@fillmap.kr",
        nickname: "서면탐험가",
        createdAt: "2026-08-06T00:00:00Z",
      }),
    );

    const { result } = renderHook(() => useSignup(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.mutate({
        body: {
          email: "seomyeon@fillmap.kr",
          password: "password12",
          nickname: "서면탐험가",
        },
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(pathnameOf(received[0].request)).toBe("/api/auth/signup");
    // 봉투 언랩 — 화면(후속 폼 티켓)은 봉투 계층을 모른다
    expect(result.current.data).toEqual({
      id: 1,
      email: "seomyeon@fillmap.kr",
      nickname: "서면탐험가",
      createdAt: "2026-08-06T00:00:00Z",
    });
    // 자동 로그인 여부는 후속 화면 티켓 결정 — 스토어는 건드리지 않는다
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe("useLogout (기준 9)", () => {
  it("성공 시 /api/auth/logout 호출 후 로컬 토큰·인증 상태를 비운다", async () => {
    useAuthStore.getState().setAccessToken("session-token");
    const received = stubFetch(() => new Response(null, { status: 200 }));

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(pathnameOf(received[0].request)).toBe("/api/auth/logout");
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("API가 실패해도 로컬 토큰·인증 상태를 비운다 — 로컬 우선 종료", async () => {
    useAuthStore.getState().setAccessToken("session-token");
    stubFetch(() => new Response(null, { status: 500 }));

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    });
    act(() => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

/**
 * 리뷰 반영 — 인증 상태가 바뀌면 이전 사용자의 쿼리 캐시가 남아선 안 된다.
 * 로그아웃 후 캐시에 남은 프로필이 다음 사용자에게 보이는 것을 막는다.
 * 회원가입은 자동 로그인을 하지 않아(추정 7) 인증 상태를 바꾸지 않으므로 대상이 아니다.
 */
describe("인증 상태 전이 시 쿼리 캐시 초기화 (리뷰 반영)", () => {
  const seededClient = () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["profile"], { nickname: "이전 사용자" });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  it("로그인 성공 시 이전 세션의 쿼리 캐시가 비워진다", async () => {
    stubFetch(() =>
      envelopeResponse({ accessToken: "new-token", refreshToken: null }),
    );
    const { queryClient, wrapper } = seededClient();

    const { result } = renderHook(() => useDevSocialLogin(), { wrapper });
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(["profile"])).toBeUndefined();
  });

  /**
   * 로그아웃은 비우지 않는다 — 교차 사용자 노출은 로그인 쪽 clear()가 막고,
   * 여기서 비우면 화면에 남은 프로필 패널이 로딩→오류로 떨어져 "패널에 머문다"는
   * MSG-124 F2 계약이 깨진다. 이 단정이 그 결정을 고정한다.
   */
  it("로그아웃은 캐시를 비우지 않는다 (다음 로그인이 비운다)", async () => {
    stubFetch(() => new Response(null, { status: 200 }));
    const { queryClient, wrapper } = seededClient();

    const { result } = renderHook(() => useLogout(), { wrapper });
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(["profile"])).toEqual({
      nickname: "이전 사용자",
    });
  });

  it("회원가입은 인증 상태를 바꾸지 않으므로 캐시를 유지한다", async () => {
    stubFetch(() => envelopeResponse({ userId: 1 }));
    const { queryClient, wrapper } = seededClient();

    const { result } = renderHook(() => useSignup(), { wrapper });
    act(() =>
      result.current.mutate({
        body: { email: "a@b.c", password: "pw", nickname: "n" },
      }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(["profile"])).toEqual({
      nickname: "이전 사용자",
    });
  });
});
