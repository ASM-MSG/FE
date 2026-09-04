import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emailChangeItem, emailChangeList } from "@/test/admin-account-fixture";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import type { EmailChangeStatus } from "../model/account-view";
import { useEmailChangeRequestsQuery } from "./use-email-change-requests-query";

const stubEmailChangesByStatus = () =>
  stubFetch(async (request) => {
    const status = new URL(request.url).searchParams.get("status");
    if (status === "APPROVED") {
      return envelopeResponse(
        emailChangeList({
          requests: [emailChangeItem({ id: 92, status: "APPROVED" })],
        }),
      );
    }
    return envelopeResponse(emailChangeList());
  });

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useEmailChangeRequestsQuery — 아이디 변경 큐 조회 (AC 7)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("선택 status로 page=0·size=100 조회하고 counts 3종을 함께 돌려준다 (AC 7)", async () => {
    const received = stubEmailChangesByStatus();

    const { result } = renderHook(
      () => useEmailChangeRequestsQuery("PENDING"),
      {
        wrapper,
      },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.requests.map((request) => request.id)).toEqual([91]);
    expect(result.current.counts).toEqual({
      pendingCount: 2,
      approvedCount: 8,
      rejectedCount: 1,
    });
    const { pathname, searchParams } = new URL(received[0].request.url);
    expect(pathname).toBe("/api/admin/email-change-requests");
    expect(searchParams.get("status")).toBe("PENDING");
    expect(searchParams.get("page")).toBe("0");
    expect(searchParams.get("size")).toBe("100");
  });

  it("status를 바꾸면 그 필터 목록으로 재조회된다 (AC 7)", async () => {
    stubEmailChangesByStatus();
    const { result, rerender } = renderHook(
      ({ status }: { status: EmailChangeStatus }) =>
        useEmailChangeRequestsQuery(status),
      {
        wrapper,
        initialProps: { status: "PENDING" } as { status: EmailChangeStatus },
      },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    rerender({ status: "APPROVED" });

    await waitFor(() =>
      expect(result.current.requests.map((request) => request.id)).toEqual([
        92,
      ]),
    );
  });

  it("조회 실패는 isError로 수렴하고 counts는 비어 있다 (AC 14)", async () => {
    stubFetch(async () => errorEnvelope(1400, "서버 오류", 500));

    const { result } = renderHook(
      () => useEmailChangeRequestsQuery("PENDING"),
      {
        wrapper,
      },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.requests).toEqual([]);
    expect(result.current.counts).toBeNull();
  });
});
