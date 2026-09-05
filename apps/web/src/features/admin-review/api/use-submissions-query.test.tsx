import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminReviewFetch, submissionItem } from "@/test/admin-review-fixture";
import { useSubmissionsQuery } from "./use-submissions-query";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const LISTS = {
  IN_REVIEW: [submissionItem({ id: 1204, title: "광안리 M 드론쇼" })],
  APPROVED: [
    submissionItem({ id: 900, title: "부산바다축제", status: "APPROVED" }),
  ],
};

describe("useSubmissionsQuery — 상태별 심사 큐 목록 조회 (AC 3)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("선택한 상태의 목록을 봉투 언랩해 내준다 — page=0·size=100 단일 페이지 계약을 벗어나면 서버가 400을 낸다 (AC 3, 추정 4)", async () => {
    adminReviewFetch({ lists: LISTS });

    const { result } = renderHook(() => useSubmissionsQuery("IN_REVIEW"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.submissions.map((item) => item.title)).toEqual([
      "광안리 M 드론쇼",
    ]);
  });

  it("status가 바뀌면 그 상태의 목록으로 갈아탄다 — 쿼리 키가 갈라져 재조회된다 (AC 3)", async () => {
    adminReviewFetch({ lists: LISTS });

    const { result, rerender } = renderHook(
      ({ status }: { status: "IN_REVIEW" | "APPROVED" }) =>
        useSubmissionsQuery(status),
      {
        wrapper,
        initialProps: { status: "IN_REVIEW" } as {
          status: "IN_REVIEW" | "APPROVED";
        },
      },
    );
    await waitFor(() => expect(result.current.submissions).toHaveLength(1));

    rerender({ status: "APPROVED" });

    await waitFor(() =>
      expect(result.current.submissions.map((item) => item.id)).toEqual([900]),
    );
  });

  it("counts는 필터와 무관하게 상태 3종 건수를 노출한다 (AC 3)", async () => {
    adminReviewFetch({ lists: LISTS });

    const { result } = renderHook(() => useSubmissionsQuery("APPROVED"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.counts).not.toBeNull());
    expect(result.current.counts).toEqual({
      inReview: 4,
      approved: 12,
      rejected: 3,
    });
  });

  it("조회 실패는 isError로 수렴하고 목록은 비어 있다 — RetryNotice 재료 (AC 11)", async () => {
    adminReviewFetch({ lists: LISTS, listFails: () => true });

    const { result } = renderHook(() => useSubmissionsQuery("IN_REVIEW"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.submissions).toEqual([]);
  });
});
