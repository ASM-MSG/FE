import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  accountRequestItem,
  accountRequestList,
} from "@/test/admin-account-fixture";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import type { AccountRequestStatus } from "../model/account-view";
import { useAccountRequestsQuery } from "./use-account-requests-query";

/** status로 갈라 응답하는 스텁 — 필터 계약을 스텁 분기로 강제한다 */
const stubRequestsByStatus = () =>
  stubFetch(async (request) => {
    const status = new URL(request.url).searchParams.get("status");
    if (status === "REJECTED") {
      return envelopeResponse(
        accountRequestList({
          requests: [
            accountRequestItem({
              id: 78,
              orgName: "사하구청",
              status: "REJECTED",
            }),
          ],
        }),
      );
    }
    return envelopeResponse(accountRequestList());
  });

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useAccountRequestsQuery — 발급 요청 큐 조회 (AC 5)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("선택 status로 page=0·size=100 조회하고 counts 3종을 함께 돌려준다 (AC 5)", async () => {
    const received = stubRequestsByStatus();

    const { result } = renderHook(() => useAccountRequestsQuery("PENDING"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.requests.map((request) => request.id)).toEqual([77]);
    expect(result.current.counts).toEqual({
      pendingCount: 3,
      issuedCount: 12,
      rejectedCount: 1,
    });
    const { pathname, searchParams } = new URL(received[0].request.url);
    expect(pathname).toBe("/api/admin/org-account-requests");
    expect(searchParams.get("status")).toBe("PENDING");
    expect(searchParams.get("page")).toBe("0");
    expect(searchParams.get("size")).toBe("100");
  });

  it("status를 바꾸면 그 필터 목록으로 재조회된다 (AC 5)", async () => {
    stubRequestsByStatus();
    const { result, rerender } = renderHook(
      ({ status }: { status: AccountRequestStatus }) =>
        useAccountRequestsQuery(status),
      {
        wrapper,
        initialProps: { status: "PENDING" } as { status: AccountRequestStatus },
      },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    rerender({ status: "REJECTED" });

    await waitFor(() =>
      expect(result.current.requests.map((request) => request.id)).toEqual([
        78,
      ]),
    );
  });

  it("조회 실패는 isError로 수렴하고 counts는 비어 있다 (AC 14)", async () => {
    stubFetch(async () => errorEnvelope(1400, "서버 오류", 500));

    const { result } = renderHook(() => useAccountRequestsQuery("PENDING"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.requests).toEqual([]);
    expect(result.current.counts).toBeNull();
  });
});
