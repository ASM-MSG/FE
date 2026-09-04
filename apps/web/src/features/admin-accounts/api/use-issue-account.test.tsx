import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAccountsQueryKey } from "@/shared/api/generated/@tanstack/react-query.gen";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { useIssueAccount } from "./use-issue-account";

const ACCOUNTS_KEY = getAccountsQueryKey({ query: { page: 0, size: 100 } });

const FORM = {
  orgName: "부산진구청",
  contactName: "김담당",
  email: "tourism@busanjin.go.kr",
};

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useIssueAccount — 직접 발급 (AC 4·9)", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    // 무효화 관찰 대상 — 계정 목록이 이미 캐시에 있다
    queryClient.setQueryData(ACCOUNTS_KEY, { developCode: 0, message: "ok" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("폼 값 3종만 실어 발급을 발사한다 — contactPhone은 보내지 않는다 (AC 4)", async () => {
    const received = stubFetch(async () =>
      envelopeResponse({ userId: 501, emailSent: true }),
    );
    const onIssued = vi.fn();
    const { result } = renderHook(() => useIssueAccount({ onIssued }), {
      wrapper,
    });

    result.current.mutate(FORM);

    await waitFor(() => expect(onIssued).toHaveBeenCalledTimes(1));
    expect(received[0].request.method).toBe("POST");
    expect(received[0].body).toEqual(FORM);
  });

  it("성공하면 계정 목록 캐시가 무효화된다 (AC 4·9)", async () => {
    stubFetch(async () => envelopeResponse({ userId: 501, emailSent: true }));
    const { result } = renderHook(() => useIssueAccount(), { wrapper });

    result.current.mutate(FORM);

    await waitFor(() =>
      expect(queryClient.getQueryState(ACCOUNTS_KEY)?.isInvalidated).toBe(true),
    );
  });

  it("응답에는 비밀번호 필드가 없고 발송 여부만 콜백으로 넘어온다 (AC 4·8)", async () => {
    stubFetch(async () => envelopeResponse({ userId: 501, emailSent: false }));
    const onIssued = vi.fn();
    const { result } = renderHook(() => useIssueAccount({ onIssued }), {
      wrapper,
    });

    result.current.mutate(FORM);

    await waitFor(() => expect(onIssued).toHaveBeenCalledTimes(1));
    expect(Object.keys(onIssued.mock.calls[0][0])).toEqual([
      "userId",
      "emailSent",
    ]);
    expect(onIssued.mock.calls[0][0].emailSent).toBe(false);
  });

  it("409(1409)는 이메일 충돌 안내로 갈라 알리고 계정 목록을 재조회한다 (AC 9)", async () => {
    stubFetch(async () => errorEnvelope(1409, "이미 계정이 있습니다", 409));
    const onFailed = vi.fn();
    const { result } = renderHook(() => useIssueAccount({ onFailed }), {
      wrapper,
    });

    result.current.mutate(FORM);

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].nextStep).toBe("CHECK_ACCOUNTS");
    expect(queryClient.getQueryState(ACCOUNTS_KEY)?.isInvalidated).toBe(true);
  });

  it("그 외 실패는 캐시를 건드리지 않고 재시도 안내만 올린다 (AC 9)", async () => {
    stubFetch(async () => errorEnvelope(1400, "서버 오류", 500));
    const onFailed = vi.fn();
    const { result } = renderHook(() => useIssueAccount({ onFailed }), {
      wrapper,
    });

    result.current.mutate(FORM);

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].nextStep).toBe("RETRY");
    expect(queryClient.getQueryState(ACCOUNTS_KEY)?.isInvalidated).toBe(false);
  });
});
