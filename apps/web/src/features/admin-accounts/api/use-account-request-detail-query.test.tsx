import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { accountRequestDetail } from "@/test/admin-account-fixture";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { useAccountRequestDetailQuery } from "./use-account-request-detail-query";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useAccountRequestDetailQuery — 선택 요청 상세 (AC 5)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("행 미선택(null)이면 요청을 발사하지 않고 로딩으로도 보이지 않는다 (AC 5)", async () => {
    const received = stubFetch(async () =>
      envelopeResponse(accountRequestDetail()),
    );

    const { result } = renderHook(() => useAccountRequestDetailQuery(null), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(received).toHaveLength(0);
    expect(result.current.detail).toBeNull();
  });

  it("행을 선택하면 그 요청 상세를 조회해 검토 기준 시각까지 돌려준다 (AC 5·6)", async () => {
    const received = stubFetch(async () =>
      envelopeResponse(accountRequestDetail()),
    );

    const { result } = renderHook(() => useAccountRequestDetailQuery(77), {
      wrapper,
    });

    await waitFor(() => expect(result.current.detail).not.toBeNull());
    expect(new URL(received[0].request.url).pathname).toBe(
      "/api/admin/org-account-requests/77",
    );
    expect(result.current.detail?.content).toContain("해운대 해수욕장");
    expect(result.current.detail?.updatedAt).toBe("2026-09-02T04:24:00.000Z");
  });
});
