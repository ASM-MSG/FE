import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSubmission1QueryKey,
  getSubmissionsQueryKey,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { useApproveSubmission } from "./use-approve-submission";
import { useRejectSubmission } from "./use-reject-submission";

/**
 * 심사 확정 뮤테이션 2종 (MSG-553 AC 4·10·11) — 요청 형태(승인은 본문 없음)와
 * 성공 시 큐·상세 무효화, 실패 분기 전달을 고정한다.
 */
const SUBMISSION_ID = 1204;
const LIST_KEY = getSubmissionsQueryKey({
  query: { status: "IN_REVIEW", page: 0, size: 100 },
});
const DETAIL_KEY = getSubmission1QueryKey({
  path: { submissionId: SUBMISSION_ID },
});

const approveResult = {
  submissionId: SUBMISSION_ID,
  approvalNo: "APR-2026-0031",
  status: "APPROVED",
};

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // 무효화 관찰 대상 — 심사 큐 목록(심사 중 탭)과 이 신청의 상세가 캐시에 있다
  queryClient.setQueryData(LIST_KEY, { developCode: 0, message: "ok" });
  queryClient.setQueryData(DETAIL_KEY, { developCode: 0, message: "ok" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useApproveSubmission — 신청 승인 (AC 4·10·11)", () => {
  it("확정하면 본문 없이 승인 엔드포인트로 POST한다 (요청 본문 없음 계약)", async () => {
    const received = stubFetch(async () => envelopeResponse(approveResult));
    const onApproved = vi.fn();
    const { result } = renderHook(() => useApproveSubmission({ onApproved }), {
      wrapper,
    });

    result.current.mutate({ submissionId: SUBMISSION_ID });

    await waitFor(() => expect(onApproved).toHaveBeenCalledTimes(1));
    expect(received[0].request.method).toBe("POST");
    expect(new URL(received[0].request.url).pathname).toBe(
      `/api/admin/event-submissions/${SUBMISSION_ID}/approve`,
    );
    expect(received[0].body).toBeUndefined();
    expect(onApproved.mock.calls[0][0].approvalNo).toBe("APR-2026-0031");
  });

  it("성공하면 심사 큐 목록과 이 신청 상세 캐시가 무효화된다 (AC 10)", async () => {
    stubFetch(async () => envelopeResponse(approveResult));
    const { result } = renderHook(() => useApproveSubmission(), { wrapper });

    result.current.mutate({ submissionId: SUBMISSION_ID });

    await waitFor(() =>
      expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true),
    );
    expect(queryClient.getQueryState(DETAIL_KEY)?.isInvalidated).toBe(true);
  });

  it("13452(격자 겹침) 실패는 AREA 반려 유도 분기로 알린다 (AC 11)", async () => {
    stubFetch(async () => errorEnvelope(13452, "격자가 겹칩니다", 409));
    const onFailed = vi.fn();
    const { result } = renderHook(() => useApproveSubmission({ onFailed }), {
      wrapper,
    });

    result.current.mutate({ submissionId: SUBMISSION_ID });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].nextStep).toBe("rejectArea");
  });

  it("13450(이미 처리)은 큐 복귀 유도 분기이며 목록·상세를 다시 불러오게 한다 (AC 11)", async () => {
    stubFetch(async () => errorEnvelope(13450, "심사 중이 아닙니다", 409));
    const onFailed = vi.fn();
    const { result } = renderHook(() => useApproveSubmission({ onFailed }), {
      wrapper,
    });

    result.current.mutate({ submissionId: SUBMISSION_ID });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].nextStep).toBe("backToQueue");
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
  });

  it("그 외 실패는 캐시를 건드리지 않고 재시도 안내만 올린다 (AC 11)", async () => {
    stubFetch(async () => errorEnvelope(13400, "서버 오류", 500));
    const onFailed = vi.fn();
    const { result } = renderHook(() => useApproveSubmission({ onFailed }), {
      wrapper,
    });

    result.current.mutate({ submissionId: SUBMISSION_ID });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].nextStep).toBe("retry");
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(false);
  });
});

describe("useRejectSubmission — 신청 반려 (AC 4·9·10)", () => {
  it("체크된 항목 코드 배열과 사유 텍스트를 본문으로 POST한다 (AC 9)", async () => {
    const received = stubFetch(async () => envelopeResponse(null));
    const onRejected = vi.fn();
    const { result } = renderHook(() => useRejectSubmission({ onRejected }), {
      wrapper,
    });

    result.current.mutate({
      submissionId: SUBMISSION_ID,
      reasonCodes: ["PERIOD", "AREA"],
      reasonText: "기간이 지났고 영역이 겹칩니다",
    });

    await waitFor(() => expect(onRejected).toHaveBeenCalledTimes(1));
    expect(new URL(received[0].request.url).pathname).toBe(
      `/api/admin/event-submissions/${SUBMISSION_ID}/reject`,
    );
    expect(received[0].body).toEqual({
      reasonCodes: ["PERIOD", "AREA"],
      reasonText: "기간이 지났고 영역이 겹칩니다",
    });
  });

  it("성공하면 심사 큐 목록과 이 신청 상세 캐시가 무효화된다 (AC 10)", async () => {
    stubFetch(async () => envelopeResponse(null));
    const { result } = renderHook(() => useRejectSubmission(), { wrapper });

    result.current.mutate({
      submissionId: SUBMISSION_ID,
      reasonCodes: ["AREA"],
      reasonText: "영역이 겹칩니다",
    });

    await waitFor(() =>
      expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true),
    );
    expect(queryClient.getQueryState(DETAIL_KEY)?.isInvalidated).toBe(true);
  });

  it("13450(이미 처리) 실패는 큐 복귀 유도 분기로 알린다 (AC 11)", async () => {
    stubFetch(async () => errorEnvelope(13450, "심사 중이 아닙니다", 409));
    const onFailed = vi.fn();
    const { result } = renderHook(() => useRejectSubmission({ onFailed }), {
      wrapper,
    });

    result.current.mutate({
      submissionId: SUBMISSION_ID,
      reasonCodes: ["AREA"],
      reasonText: "영역이 겹칩니다",
    });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].nextStep).toBe("backToQueue");
  });
});
