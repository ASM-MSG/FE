import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMySubmissionsQuery } from "@/features/org-submissions/api/use-my-submissions-query";
import { useSubmissionDetailQuery } from "@/features/org-submissions/api/use-submission-detail-query";
import type { EventSubmissionUpdateRequestDto } from "@/shared/api/generated/types.gen";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { MY_LIST, rejectedEditableDetail } from "@/test/org-submission-fixture";
import { stubFetch } from "@/test/stub-fetch";
import { useResubmitSubmission } from "./use-resubmit-submission";

/** 실패 경로를 단정하므로 재시도 백오프를 끈 로컬 래퍼를 쓴다 (query-wrapper 주석의 예외 경로) */
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
    }
  >
    {children}
  </QueryClientProvider>
);

const SUBMISSION_ID = 12;

const BODY: EventSubmissionUpdateRequestDto = {
  title: "서면 야간 드론쇼",
  organizerName: "서면상권활성화협의회",
  startsOn: "2026-09-05",
  endsOn: "2026-09-07",
  description: "서면 일대에서 열리는 야간 드론쇼입니다.",
  programDescription: "드론 라이트쇼 · 거리 버스킹",
  locations: [
    {
      areaRects: [
        {
          minGridX: 39064,
          maxGridX: 39065,
          minGridY: 112221,
          maxGridY: 112222,
        },
      ],
    },
  ],
};

const RECEIPT = { id: 12, submissionNo: "ES-2026-0012", status: "IN_REVIEW" };

const DETAIL_PATH = `/api/org/event-submissions/${SUBMISSION_ID}`;

describe("useResubmitSubmission — 반려본 수정 재제출 (AC 5·6·7)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("재제출 본문을 신청 경로에 PATCH 1회로 보내고 봉투를 벗긴 접수 결과를 준다 (AC 5)", async () => {
    const received = stubFetch(() => envelopeResponse(RECEIPT));
    const { result } = renderHook(() => useResubmitSubmission(), { wrapper });

    result.current.mutate({ submissionId: SUBMISSION_ID, body: BODY });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(RECEIPT);
    const patched = received.filter(
      ({ request }) => request.method === "PATCH",
    );
    expect(patched).toHaveLength(1);
    expect(new URL(patched[0].request.url).pathname).toBe(DETAIL_PATH);
    expect(patched[0].body).toEqual(BODY);
  });

  it("성공하면 내 신청 목록과 그 신청 상세가 함께 무효화돼 다시 조회된다 (AC 6)", async () => {
    let listRequests = 0;
    let detailRequests = 0;
    stubFetch((request) => {
      const { pathname } = new URL(request.url);
      if (pathname.endsWith("/my")) {
        listRequests += 1;
        return envelopeResponse(MY_LIST);
      }
      if (request.method === "GET" && pathname === DETAIL_PATH) {
        detailRequests += 1;
        return envelopeResponse(rejectedEditableDetail());
      }
      return envelopeResponse(RECEIPT);
    });
    const { result } = renderHook(
      () => ({
        list: useMySubmissionsQuery(),
        detail: useSubmissionDetailQuery(SUBMISSION_ID),
        resubmit: useResubmitSubmission(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.isPending).toBe(false));
    await waitFor(() => expect(result.current.detail.detail).not.toBeNull());
    expect(listRequests).toBe(1);
    expect(detailRequests).toBe(1);

    result.current.resubmit.mutate({ submissionId: SUBMISSION_ID, body: BODY });

    await waitFor(() => expect(listRequests).toBe(2));
    await waitFor(() => expect(detailRequests).toBe(2));
  });

  it("실패하면 오류가 전파되고 캐시 무효화도 일어나지 않는다 (AC 7)", async () => {
    let listRequests = 0;
    stubFetch((request) => {
      if (new URL(request.url).pathname.endsWith("/my")) {
        listRequests += 1;
        return envelopeResponse(MY_LIST);
      }
      return errorEnvelope(13433, "종료일이 오늘 이전입니다", 400);
    });
    const { result } = renderHook(
      () => ({
        list: useMySubmissionsQuery(),
        resubmit: useResubmitSubmission(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.isPending).toBe(false));

    result.current.resubmit.mutate({ submissionId: SUBMISSION_ID, body: BODY });

    await waitFor(() => expect(result.current.resubmit.isError).toBe(true));
    expect(listRequests).toBe(1);
  });
});
