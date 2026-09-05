import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAccountsQueryKey,
  getRequestQueryKey,
  getRequestsQueryKey,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import {
  useApproveAccountRequest,
  useRejectAccountRequest,
} from "./use-account-request-mutations";

const ACCOUNTS_KEY = getAccountsQueryKey({ query: { page: 0, size: 100 } });
const REQUESTS_KEY = getRequestsQueryKey({
  query: { status: "PENDING", page: 0, size: 100 },
});
const DETAIL_KEY = getRequestQueryKey({ path: { requestId: 77 } });

/** 상세 응답의 검토 기준 시각 — 승인·반려 바디에 그대로 에코돼야 한다 */
const REVIEWED_AT = "2026-09-02T04:24:00.000Z";

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const seedCaches = () => {
  queryClient.setQueryData(REQUESTS_KEY, { developCode: 0, message: "ok" });
  queryClient.setQueryData(DETAIL_KEY, { developCode: 0, message: "ok" });
  queryClient.setQueryData(ACCOUNTS_KEY, { developCode: 0, message: "ok" });
};

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  seedCaches();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useApproveAccountRequest — 발급 요청 승인 (AC 6·12)", () => {
  it("상세의 updatedAt을 그대로 에코해 승인을 발사한다 (AC 6·12)", async () => {
    const received = stubFetch(async () =>
      envelopeResponse({ userId: 501, emailSent: true }),
    );
    const onApproved = vi.fn();
    const { result } = renderHook(
      () => useApproveAccountRequest({ onApproved }),
      { wrapper },
    );

    result.current.mutate({ requestId: 77, updatedAt: REVIEWED_AT });

    await waitFor(() => expect(onApproved).toHaveBeenCalledTimes(1));
    expect(new URL(received[0].request.url).pathname).toBe(
      "/api/admin/org-account-requests/77/approve",
    );
    expect(received[0].body).toEqual({ updatedAt: REVIEWED_AT });
    expect(onApproved.mock.calls[0][0].emailSent).toBe(true);
  });

  it("성공하면 요청 목록·해당 상세·계정 목록이 모두 무효화된다 (AC 6)", async () => {
    stubFetch(async () => envelopeResponse({ userId: 501, emailSent: true }));
    const { result } = renderHook(() => useApproveAccountRequest(), {
      wrapper,
    });

    result.current.mutate({ requestId: 77, updatedAt: REVIEWED_AT });

    await waitFor(() =>
      expect(queryClient.getQueryState(REQUESTS_KEY)?.isInvalidated).toBe(true),
    );
    expect(queryClient.getQueryState(DETAIL_KEY)?.isInvalidated).toBe(true);
    // 승인은 계정을 만든다 — 운영자 계정 탭 목록도 스테일이다
    expect(queryClient.getQueryState(ACCOUNTS_KEY)?.isInvalidated).toBe(true);
  });

  it("409(1422 이미 처리)와 409(1426 검토 이후 변경)가 다른 다음 조작으로 갈린다 (AC 12)", async () => {
    stubFetch(async () => errorEnvelope(1422, "이미 처리된 요청입니다", 409));
    const onFailed = vi.fn();
    const { result } = renderHook(
      () => useApproveAccountRequest({ onFailed }),
      { wrapper },
    );

    result.current.mutate({ requestId: 77, updatedAt: REVIEWED_AT });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].nextStep).toBe("REVIEW_LIST");
    // 서버 진실이 바뀐 실패라 목록·상세를 재조회해 스테일 카드를 걷는다
    expect(queryClient.getQueryState(REQUESTS_KEY)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(DETAIL_KEY)?.isInvalidated).toBe(true);
  });

  it("409(1426)는 재검토 유도로 갈린다 (AC 12)", async () => {
    stubFetch(async () => errorEnvelope(1426, "검토 이후 변경됐습니다", 409));
    const onFailed = vi.fn();
    const { result } = renderHook(
      () => useApproveAccountRequest({ onFailed }),
      { wrapper },
    );

    result.current.mutate({ requestId: 77, updatedAt: REVIEWED_AT });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].nextStep).toBe("REREAD_REQUEST");
    expect(queryClient.getQueryState(DETAIL_KEY)?.isInvalidated).toBe(true);
  });

  it("409(1409 이메일 충돌)은 안내가 가리키는 계정 목록까지 무효화한다 (codex P2)", async () => {
    stubFetch(async () => errorEnvelope(1409, "이미 계정이 있습니다", 409));
    const onFailed = vi.fn();
    const { result } = renderHook(
      () => useApproveAccountRequest({ onFailed }),
      { wrapper },
    );

    result.current.mutate({ requestId: 77, updatedAt: REVIEWED_AT });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].nextStep).toBe("CHECK_ACCOUNTS");
    // 안내가 "계정 목록에서 발급 여부 확인"인데 그 캐시가 스테일이면 안내가 거짓이 된다
    // (전역 staleTime 30초 안에 탭을 본 적 있으면 되돌아가도 재조회가 없다)
    expect(queryClient.getQueryState(ACCOUNTS_KEY)?.isInvalidated).toBe(true);
  });

  it("그 외 실패는 캐시를 건드리지 않는다 (AC 12)", async () => {
    stubFetch(async () => errorEnvelope(1400, "서버 오류", 500));
    const onFailed = vi.fn();
    const { result } = renderHook(
      () => useApproveAccountRequest({ onFailed }),
      { wrapper },
    );

    result.current.mutate({ requestId: 77, updatedAt: REVIEWED_AT });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(queryClient.getQueryState(REQUESTS_KEY)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(ACCOUNTS_KEY)?.isInvalidated).toBe(false);
  });
});

describe("useRejectAccountRequest — 발급 요청 반려 (AC 6·12)", () => {
  it("사유와 updatedAt을 실어 반려를 발사한다 (AC 6·12)", async () => {
    const received = stubFetch(async () => envelopeResponse(null));
    const onRejected = vi.fn();
    const { result } = renderHook(
      () => useRejectAccountRequest({ onRejected }),
      { wrapper },
    );

    result.current.mutate({
      requestId: 77,
      reason: "공문 확인 불가",
      updatedAt: REVIEWED_AT,
    });

    await waitFor(() => expect(onRejected).toHaveBeenCalledTimes(1));
    expect(new URL(received[0].request.url).pathname).toBe(
      "/api/admin/org-account-requests/77/reject",
    );
    expect(received[0].body).toEqual({
      reason: "공문 확인 불가",
      updatedAt: REVIEWED_AT,
    });
  });

  it("성공하면 요청 목록·상세만 무효화한다 — 반려는 계정을 만들지 않는다 (AC 6)", async () => {
    stubFetch(async () => envelopeResponse(null));
    const { result } = renderHook(() => useRejectAccountRequest(), { wrapper });

    result.current.mutate({
      requestId: 77,
      reason: "공문 확인 불가",
      updatedAt: REVIEWED_AT,
    });

    await waitFor(() =>
      expect(queryClient.getQueryState(REQUESTS_KEY)?.isInvalidated).toBe(true),
    );
    expect(queryClient.getQueryState(DETAIL_KEY)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(ACCOUNTS_KEY)?.isInvalidated).toBe(false);
  });
});
