import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMySubmissionsQuery } from "@/features/org-submissions/api/use-my-submissions-query";
import type { EventSubmissionCreateRequestDto } from "@/shared/api/generated/types.gen";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { useSubmitSubmission } from "./use-submit-submission";

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

const REQUEST: EventSubmissionCreateRequestDto = {
  type: "FESTIVAL",
  title: "광안리 M 드론쇼",
  organizerName: "부산광역시 관광마이스과",
  startsOn: "2026-09-05",
  endsOn: "2026-09-07",
  description: "광안리 해변의 밤하늘을 수놓는 정기 드론 공연입니다.",
  imageS3Key: "pending/submissions/abc.jpg",
  programDescription: "드론 공연 · 체험 부스",
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

const RECEIPT = { id: 1204, submissionNo: "FM-2026-0007", status: "IN_REVIEW" };

const MY_LIST = {
  counts: { inReview: 0, approved: 0, rejected: 0 },
  submissions: [],
};

describe("useSubmitSubmission — 행사 등록 신청 제출 (AC 7·9)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("제출 본문을 그대로 POST하고 봉투를 벗긴 접수 결과를 준다 (AC 7)", async () => {
    const received = stubFetch(() => envelopeResponse(RECEIPT));
    const { result } = renderHook(() => useSubmitSubmission(), { wrapper });

    result.current.mutate(REQUEST);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(RECEIPT);
    const submitted = received.filter(
      ({ request }) =>
        new URL(request.url).pathname === "/api/org/event-submissions",
    );
    expect(submitted).toHaveLength(1);
    expect(submitted[0].request.method).toBe("POST");
    expect(submitted[0].body).toEqual(REQUEST);
  });

  it("성공하면 내 신청 목록 쿼리가 무효화돼 목록이 다시 조회된다 (AC 9)", async () => {
    let listRequests = 0;
    stubFetch((request) => {
      if (new URL(request.url).pathname.endsWith("/my")) {
        listRequests += 1;
        return envelopeResponse(MY_LIST);
      }
      return envelopeResponse(RECEIPT);
    });
    const { result } = renderHook(
      () => ({ list: useMySubmissionsQuery(), submit: useSubmitSubmission() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    expect(listRequests).toBe(1);

    result.current.submit.mutate(REQUEST);

    await waitFor(() => expect(listRequests).toBe(2));
  });

  it("실패하면 오류가 전파되고 목록 무효화도 일어나지 않는다 (AC 11)", async () => {
    let listRequests = 0;
    stubFetch((request) => {
      if (new URL(request.url).pathname.endsWith("/my")) {
        listRequests += 1;
        return envelopeResponse(MY_LIST);
      }
      return errorEnvelope(13433, "종료일이 오늘 이전입니다", 400);
    });
    const { result } = renderHook(
      () => ({ list: useMySubmissionsQuery(), submit: useSubmitSubmission() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));

    result.current.submit.mutate(REQUEST);

    await waitFor(() => expect(result.current.submit.isError).toBe(true));
    expect(listRequests).toBe(1);
  });
});
