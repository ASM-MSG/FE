import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAccountsQueryKey } from "@/shared/api/generated/@tanstack/react-query.gen";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { useResendPassword } from "./use-resend-password";

const ACCOUNTS_KEY = getAccountsQueryKey({ query: { page: 0, size: 100 } });

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useResendPassword — 비밀번호 재발송 (AC 10)", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(ACCOUNTS_KEY, { developCode: 0, message: "ok" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("대상 계정의 재발송 경로로 바디 없이 발사한다 (AC 10)", async () => {
    const received = stubFetch(async () =>
      envelopeResponse({ emailSent: true }),
    );
    const onResent = vi.fn();
    const { result } = renderHook(() => useResendPassword({ onResent }), {
      wrapper,
    });

    result.current.mutate({ userId: 501 });

    await waitFor(() => expect(onResent).toHaveBeenCalledTimes(1));
    expect(new URL(received[0].request.url).pathname).toBe(
      "/api/admin/organizations/501/resend-password",
    );
    expect(received[0].request.method).toBe("POST");
    expect(received[0].body).toBeUndefined();
    expect(onResent.mock.calls[0][0].emailSent).toBe(true);
  });

  it("emailSent=false도 성공으로 처리하고 결과에 실어 알린다 (AC 10)", async () => {
    stubFetch(async () => envelopeResponse({ emailSent: false }));
    const onResent = vi.fn();
    const { result } = renderHook(() => useResendPassword({ onResent }), {
      wrapper,
    });

    result.current.mutate({ userId: 501 });

    await waitFor(() => expect(onResent).toHaveBeenCalledTimes(1));
    expect(onResent.mock.calls[0][0].emailSent).toBe(false);
  });

  it("409(1423)는 이미 변경한 계정 안내로 갈라 알리고 목록을 재조회한다 (AC 10)", async () => {
    stubFetch(async () =>
      errorEnvelope(1423, "이미 비밀번호를 변경했습니다", 409),
    );
    const onFailed = vi.fn();
    const { result } = renderHook(() => useResendPassword({ onFailed }), {
      wrapper,
    });

    result.current.mutate({ userId: 501 });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].nextStep).toBe("PASSWORD_RESET");
    // 스테일 mustChange 라벨을 복구한다 — 재발송 버튼이 남아 같은 409를 반복하지 않게
    expect(queryClient.getQueryState(ACCOUNTS_KEY)?.isInvalidated).toBe(true);
  });

  it("그 외 실패는 캐시를 건드리지 않는다 (AC 10)", async () => {
    stubFetch(async () => errorEnvelope(1400, "서버 오류", 500));
    const onFailed = vi.fn();
    const { result } = renderHook(() => useResendPassword({ onFailed }), {
      wrapper,
    });

    result.current.mutate({ userId: 501 });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(queryClient.getQueryState(ACCOUNTS_KEY)?.isInvalidated).toBe(false);
  });
});
