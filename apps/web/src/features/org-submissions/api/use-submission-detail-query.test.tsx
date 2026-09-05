import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { REJECTED_DETAIL } from "@/test/org-submission-fixture";
import { stubFetch } from "@/test/stub-fetch";
import { useSubmissionDetailQuery } from "./use-submission-detail-query";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useSubmissionDetailQuery — 반려 사유·이력 병행 조회 (AC 5, 추정 4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submissionId가 없으면 요청을 발사하지 않는다 — 대표가 비반려면 상세를 조회하지 않는다 (AC 5)", () => {
    const received = stubFetch(() => envelopeResponse(REJECTED_DETAIL));

    const { result } = renderHook(() => useSubmissionDetailQuery(null), {
      wrapper,
    });

    expect(received).toHaveLength(0);
    expect(result.current.detail).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it("submissionId가 있으면 봉투를 언랩해 반려 사유 본문과 이력을 노출한다 (AC 5)", async () => {
    stubFetch(() => envelopeResponse(REJECTED_DETAIL));

    const { result } = renderHook(() => useSubmissionDetailQuery(12), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.detail?.rejection?.reasonText).toBe(
      "행사 장소와 직접 관련 없는 격자가 포함되어 있습니다.",
    );
    expect(result.current.detail?.history).toHaveLength(2);
  });

  it("상세 조회가 실패하면 isError로 수렴한다 — 사유 영역 재시도의 조건 (AC 5)", async () => {
    stubFetch(() => errorEnvelope(14500, "server error", 500));

    const { result } = renderHook(() => useSubmissionDetailQuery(12), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
