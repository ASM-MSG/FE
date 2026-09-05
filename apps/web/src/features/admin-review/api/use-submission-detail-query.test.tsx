import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adminReviewFetch,
  submissionDetail,
} from "@/test/admin-review-fixture";
import { useSubmissionDetailQuery } from "./use-submission-detail-query";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const DETAILS = { 1204: submissionDetail() };

describe("useSubmissionDetailQuery — 선택 신청 미리보기 보강 조회 (AC 4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("행이 선택되면 상세를 조회해 대표 이미지·위치 재료를 내준다 (AC 4)", async () => {
    adminReviewFetch({ lists: { IN_REVIEW: [] }, details: DETAILS });

    const { result } = renderHook(() => useSubmissionDetailQuery(1204), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.detail?.imageUrl).toBe(
      "https://cdn.fillmap.kr/submissions/1204.jpg?signature=abc",
    );
    expect(result.current.detail?.locations).toHaveLength(2);
  });

  it("선택된 행이 없으면(null) 조회하지 않는다 (AC 4)", () => {
    const received = adminReviewFetch({
      lists: { IN_REVIEW: [] },
      details: DETAILS,
    });

    renderHook(() => useSubmissionDetailQuery(null), { wrapper });

    expect(received).toEqual([]);
  });

  it("상세 조회 실패는 isError로 수렴한다 — 재시도 UI 재료 (AC 7)", async () => {
    adminReviewFetch({ lists: { IN_REVIEW: [] }, details: {} });

    const { result } = renderHook(() => useSubmissionDetailQuery(1204), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.detail).toBeNull();
  });
});
