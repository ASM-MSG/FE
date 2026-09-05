import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { eventSubmissionDetail } from "@/test/admin-event-fixture";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { useAdminEventDetailQuery } from "./use-admin-event-detail-query";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useAdminEventDetailQuery — 선택 행사 상세 조회 (AC 4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("행이 선택되기 전에는 상세를 조회하지 않는다 (AC 4)", () => {
    const received = stubFetch(async () =>
      envelopeResponse(eventSubmissionDetail()),
    );

    const { result } = renderHook(() => useAdminEventDetailQuery(null), {
      wrapper,
    });

    expect(received).toHaveLength(0);
    expect(result.current.detail).toBeNull();
  });

  it("행을 선택하면 대표 이미지·위치·이력이 실린 상세를 돌려준다 (AC 4)", async () => {
    stubFetch(async () => envelopeResponse(eventSubmissionDetail()));

    const { result } = renderHook(() => useAdminEventDetailQuery(41), {
      wrapper,
    });

    await waitFor(() => expect(result.current.detail).not.toBeNull());
    expect(result.current.detail?.imageUrl).toContain("41.jpg");
    expect(result.current.detail?.locations).toHaveLength(2);
    expect(
      result.current.detail?.history.map((entry) => entry.status),
    ).toContain("APPROVED");
  });

  it("상세 조회 실패는 isError로 수렴한다 (AC 12)", async () => {
    stubFetch(async () => new Response("boom", { status: 500 }));

    const { result } = renderHook(() => useAdminEventDetailQuery(41), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
