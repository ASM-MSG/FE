import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { getStatusQueryKey } from "@/shared/api/generated/@tanstack/react-query.gen";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import {
  useConfirmPasswordReset,
  useRequestPasswordReset,
  useSetInitialPassword,
} from "./use-password-mutations";

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapperWith = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useSetInitialPassword — 첫 로그인 비밀번호 설정 (AC 7)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("새 비밀번호만 담아 초기 설정을 요청한다 — 현재 비밀번호 없음 (AC 7)", async () => {
    signInForTest();
    const received = stubFetch(() => envelopeResponse(null));
    const { result } = renderHook(() => useSetInitialPassword(), {
      wrapper: wrapperWith(createClient()),
    });

    result.current.mutate({ newPassword: "fillmap12" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(received.at(-1)?.body).toEqual({ newPassword: "fillmap12" });
  });

  it("성공하면 비밀번호 상태 캐시가 mustChange=false로 갱신된다 — 게이트 재발동 차단 (AC 7)", async () => {
    signInForTest();
    stubFetch(() => envelopeResponse(null));
    const client = createClient();
    client.setQueryData(getStatusQueryKey(), {
      developCode: 0,
      message: "ok",
      data: { mustChange: true },
    });
    const { result } = renderHook(() => useSetInitialPassword(), {
      wrapper: wrapperWith(client),
    });

    result.current.mutate({ newPassword: "fillmap12" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() =>
      expect(client.getQueryData(getStatusQueryKey())).toMatchObject({
        data: { mustChange: false },
      }),
    );
  });

  it("실패는 오류로 노출되어 폼이 안내할 수 있다 (AC 8)", async () => {
    signInForTest();
    stubFetch(() => errorEnvelope(2446, "이미 비밀번호를 설정했습니다", 400));
    const { result } = renderHook(() => useSetInitialPassword(), {
      wrapper: wrapperWith(createClient()),
    });

    result.current.mutate({ newPassword: "fillmap12" });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useRequestPasswordReset — 재설정 링크 요청 (AC 10)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("제출한 이메일을 담아 재설정 링크를 요청한다 (AC 10)", async () => {
    const received = stubFetch(() => envelopeResponse(null));
    const { result } = renderHook(() => useRequestPasswordReset(), {
      wrapper: wrapperWith(createClient()),
    });

    result.current.mutate({ email: "tourism@busan.go.kr" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(received.at(-1)?.body).toEqual({ email: "tourism@busan.go.kr" });
  });
});

describe("useConfirmPasswordReset — 재설정 링크로 새 비밀번호 확정 (AC 11)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("토큰과 새 비밀번호를 담아 재설정을 확정한다 (AC 11)", async () => {
    const received = stubFetch(() => envelopeResponse(null));
    const { result } = renderHook(() => useConfirmPasswordReset(), {
      wrapper: wrapperWith(createClient()),
    });

    result.current.mutate({ token: "reset-token", newPassword: "fillmap12" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(received.at(-1)?.body).toEqual({
      token: "reset-token",
      newPassword: "fillmap12",
    });
  });

  it("성공하면 로컬 세션이 정리된다 — 서버가 전 기기 세션을 무효화하므로 (AC 11·추정 7)", async () => {
    signInForTest();
    stubFetch(() => envelopeResponse(null));
    const { result } = renderHook(() => useConfirmPasswordReset(), {
      wrapper: wrapperWith(createClient()),
    });

    result.current.mutate({ token: "reset-token", newPassword: "fillmap12" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("토큰 만료·무효는 오류로 노출되어 폼이 안내할 수 있다 (AC 12)", async () => {
    stubFetch(() => errorEnvelope(1400, "링크가 만료되었습니다", 400));
    const { result } = renderHook(() => useConfirmPasswordReset(), {
      wrapper: wrapperWith(createClient()),
    });

    result.current.mutate({ token: "expired", newPassword: "fillmap12" });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
