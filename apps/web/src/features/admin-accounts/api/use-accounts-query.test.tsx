import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { orgAccountItem, orgAccountList } from "@/test/admin-account-fixture";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { useAccountsQuery } from "./use-accounts-query";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useAccountsQuery — 계정 목록 조회 (AC 3)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("page=0·size=100으로 조회하고 봉투를 언랩해 계정 목록을 돌려준다 (AC 3)", async () => {
    const received = stubFetch(async () =>
      envelopeResponse(
        orgAccountList({
          accounts: [orgAccountItem(), orgAccountItem({ userId: 502 })],
        }),
      ),
    );

    const { result } = renderHook(() => useAccountsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.accounts.map((account) => account.userId)).toEqual([
      501, 502,
    ]);
    const { pathname, searchParams } = new URL(received[0].request.url);
    expect(pathname).toBe("/api/admin/organizations");
    expect(searchParams.get("page")).toBe("0");
    expect(searchParams.get("size")).toBe("100");
  });

  it("조회 실패는 isError로 수렴해 재시도 재료가 된다 (AC 14)", async () => {
    stubFetch(async () => errorEnvelope(1400, "서버 오류", 500));

    const { result } = renderHook(() => useAccountsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.accounts).toEqual([]);
  });
});
