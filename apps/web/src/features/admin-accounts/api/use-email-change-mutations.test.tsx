import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAccountsQueryKey,
  getEmailChangeRequestsQueryKey,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import {
  useApproveEmailChange,
  useRejectEmailChange,
} from "./use-email-change-mutations";

const ACCOUNTS_KEY = getAccountsQueryKey({ query: { page: 0, size: 100 } });
const EMAIL_LIST_KEY = getEmailChangeRequestsQueryKey({
  query: { status: "PENDING", page: 0, size: 100 },
});

/** 목록 항목의 createdAt — 아이디 변경 큐의 검토 기준 시각 */
const REQUESTED_AT = "2026-09-02T05:31:00.000Z";

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(EMAIL_LIST_KEY, { developCode: 0, message: "ok" });
  queryClient.setQueryData(ACCOUNTS_KEY, { developCode: 0, message: "ok" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useApproveEmailChange — 아이디 변경 승인 (AC 7·13)", () => {
  it("목록 항목의 createdAt을 requestedAt으로 에코해 승인을 발사한다 (AC 7)", async () => {
    const received = stubFetch(async () =>
      envelopeResponse({
        requestId: 91,
        email: "culture@busanjin.go.kr",
        emailSent: true,
      }),
    );
    const onApproved = vi.fn();
    const { result } = renderHook(() => useApproveEmailChange({ onApproved }), {
      wrapper,
    });

    result.current.mutate({ requestId: 91, requestedAt: REQUESTED_AT });

    await waitFor(() => expect(onApproved).toHaveBeenCalledTimes(1));
    expect(new URL(received[0].request.url).pathname).toBe(
      "/api/admin/email-change-requests/91/approve",
    );
    expect(received[0].body).toEqual({ requestedAt: REQUESTED_AT });
    expect(onApproved.mock.calls[0][0].email).toBe("culture@busanjin.go.kr");
  });

  it("성공하면 아이디 변경 목록과 계정 목록이 모두 무효화된다 (AC 7)", async () => {
    stubFetch(async () =>
      envelopeResponse({
        requestId: 91,
        email: "culture@busanjin.go.kr",
        emailSent: true,
      }),
    );
    const { result } = renderHook(() => useApproveEmailChange(), { wrapper });

    result.current.mutate({ requestId: 91, requestedAt: REQUESTED_AT });

    await waitFor(() =>
      expect(queryClient.getQueryState(EMAIL_LIST_KEY)?.isInvalidated).toBe(
        true,
      ),
    );
    // 아이디(=계정 이메일)가 바뀐다 — 운영자 계정 목록도 스테일이다
    expect(queryClient.getQueryState(ACCOUNTS_KEY)?.isInvalidated).toBe(true);
  });

  it("409(1428 이미 처리)와 409(1429 검토 이후 변경)가 다른 다음 조작으로 갈린다 (AC 13)", async () => {
    stubFetch(async () => errorEnvelope(1428, "이미 처리된 요청입니다", 409));
    const onFailed = vi.fn();
    const { result } = renderHook(() => useApproveEmailChange({ onFailed }), {
      wrapper,
    });

    result.current.mutate({ requestId: 91, requestedAt: REQUESTED_AT });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].nextStep).toBe("REVIEW_LIST");
    expect(queryClient.getQueryState(EMAIL_LIST_KEY)?.isInvalidated).toBe(true);
  });

  it("409(1429)는 재검토 유도로 갈린다 (AC 13)", async () => {
    stubFetch(async () => errorEnvelope(1429, "검토 이후 변경됐습니다", 409));
    const onFailed = vi.fn();
    const { result } = renderHook(() => useApproveEmailChange({ onFailed }), {
      wrapper,
    });

    result.current.mutate({ requestId: 91, requestedAt: REQUESTED_AT });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].nextStep).toBe("REREAD_REQUEST");
  });

  it("409(1409 이메일 충돌)은 안내가 가리키는 계정 목록까지 무효화한다 (codex P2)", async () => {
    stubFetch(async () => errorEnvelope(1409, "이미 계정이 있습니다", 409));
    const onFailed = vi.fn();
    const { result } = renderHook(() => useApproveEmailChange({ onFailed }), {
      wrapper,
    });

    result.current.mutate({ requestId: 91, requestedAt: REQUESTED_AT });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].nextStep).toBe("CHECK_ACCOUNTS");
    // 안내가 "계정 목록에서 확인"인데 그 캐시가 스테일이면 안내가 거짓이 된다
    expect(queryClient.getQueryState(ACCOUNTS_KEY)?.isInvalidated).toBe(true);
  });
});

describe("useRejectEmailChange — 아이디 변경 반려 (AC 7·13)", () => {
  it("사유와 requestedAt을 실어 반려를 발사한다 (AC 7)", async () => {
    const received = stubFetch(async () => envelopeResponse(null));
    const onRejected = vi.fn();
    const { result } = renderHook(() => useRejectEmailChange({ onRejected }), {
      wrapper,
    });

    result.current.mutate({
      requestId: 91,
      reason: "기관 도메인이 아님",
      requestedAt: REQUESTED_AT,
    });

    await waitFor(() => expect(onRejected).toHaveBeenCalledTimes(1));
    expect(new URL(received[0].request.url).pathname).toBe(
      "/api/admin/email-change-requests/91/reject",
    );
    expect(received[0].body).toEqual({
      reason: "기관 도메인이 아님",
      requestedAt: REQUESTED_AT,
    });
  });

  it("성공하면 아이디 변경 목록만 무효화한다 — 반려는 아이디를 바꾸지 않는다 (AC 7)", async () => {
    stubFetch(async () => envelopeResponse(null));
    const { result } = renderHook(() => useRejectEmailChange(), { wrapper });

    result.current.mutate({
      requestId: 91,
      reason: "기관 도메인이 아님",
      requestedAt: REQUESTED_AT,
    });

    await waitFor(() =>
      expect(queryClient.getQueryState(EMAIL_LIST_KEY)?.isInvalidated).toBe(
        true,
      ),
    );
    expect(queryClient.getQueryState(ACCOUNTS_KEY)?.isInvalidated).toBe(false);
  });
});
