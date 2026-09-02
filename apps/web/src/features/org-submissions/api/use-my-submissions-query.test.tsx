import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { MY_LIST } from "@/test/org-submission-fixture";
import { stubFetch } from "@/test/stub-fetch";
import { useMySubmissionsQuery } from "./use-my-submissions-query";

// 실패 경로를 단정하므로 retry:false 클라이언트를 로컬로 둔다 (query-wrapper JSDoc 지침)
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useMySubmissionsQuery — 내 신청 목록 조회 (AC 1·2)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("응답 봉투를 언랩해 counts와 서버 순서의 submissions를 노출한다 (AC 2)", async () => {
    stubFetch(() => envelopeResponse(MY_LIST));

    const { result } = renderHook(() => useMySubmissionsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data?.counts.inReview).toBe(1);
    expect(result.current.data?.submissions.map((s) => s.id)).toEqual([
      11, 12, 13,
    ]);
  });

  it("조회가 실패하면 isError로 수렴한다 — RetryNotice의 조건 (AC 9)", async () => {
    stubFetch(() => errorEnvelope(14500, "server error", 500));

    const { result } = renderHook(() => useMySubmissionsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
