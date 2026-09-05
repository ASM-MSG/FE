import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getEventsQueryKey,
  getSubmission1QueryKey,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { useUnpublishEvent } from "./use-unpublish-event";

const LIST_KEY = getEventsQueryKey({ query: { status: "EXPOSED", size: 100 } });
const DETAIL_KEY = getSubmission1QueryKey({ path: { submissionId: 41 } });

const unpublishResult = (emailSent = true) => ({
  submissionId: 41,
  unpublishedAt: "2026-09-01T04:30:00Z",
  emailSent,
});

/** 캐시 핸들이 필요해 클라이언트를 테스트마다 새로 만들고 참조를 잡아 둔다 */
let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useUnpublishEvent — 노출 중지 (AC 8·9·10)", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    // 무효화 관찰 대상 — 목록(현재 탭)과 선택 행사 상세가 이미 캐시에 있다 (AC 8)
    queryClient.setQueryData(LIST_KEY, { developCode: 0, message: "ok" });
    queryClient.setQueryData(DETAIL_KEY, { developCode: 0, message: "ok" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("확정하면 입력한 사유로 중지를 발사한다 (AC 8)", async () => {
    const received = stubFetch(async () => envelopeResponse(unpublishResult()));
    const onUnpublished = vi.fn();
    const { result } = renderHook(() => useUnpublishEvent({ onUnpublished }), {
      wrapper,
    });

    result.current.mutate({ submissionId: 41, reason: "행사 정보 오류" });

    await waitFor(() => expect(onUnpublished).toHaveBeenCalledTimes(1));
    expect(received[0].request.method).toBe("POST");
    expect(received[0].body).toEqual({ reason: "행사 정보 오류" });
  });

  it("성공하면 목록·선택 행사 상세 캐시가 무효화된다 (AC 8)", async () => {
    stubFetch(async () => envelopeResponse(unpublishResult()));
    const { result } = renderHook(() => useUnpublishEvent(), { wrapper });

    result.current.mutate({ submissionId: 41, reason: "행사 정보 오류" });

    await waitFor(() =>
      expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true),
    );
    expect(queryClient.getQueryState(DETAIL_KEY)?.isInvalidated).toBe(true);
  });

  it("emailSent=false도 중지 성공으로 처리하고 결과에 실어 알린다 (AC 10)", async () => {
    stubFetch(async () => envelopeResponse(unpublishResult(false)));
    const onUnpublished = vi.fn();
    const { result } = renderHook(() => useUnpublishEvent({ onUnpublished }), {
      wrapper,
    });

    result.current.mutate({ submissionId: 41, reason: "행사 정보 오류" });

    await waitFor(() => expect(onUnpublished).toHaveBeenCalledTimes(1));
    expect(onUnpublished.mock.calls[0][0].emailSent).toBe(false);
  });

  it("409(13453)는 '이미 중지' 안내로 갈라 onFailed로 알린다 (AC 9)", async () => {
    stubFetch(async () => errorEnvelope(13453, "이미 중지된 행사입니다", 409));
    const onFailed = vi.fn();
    const { result } = renderHook(() => useUnpublishEvent({ onFailed }), {
      wrapper,
    });

    result.current.mutate({ submissionId: 41, reason: "행사 정보 오류" });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].alreadyUnpublished).toBe(true);
    // 이미 중지 = 서버 진실이 바뀐 신호 — 스테일 행이 남지 않게 목록·상세를 재조회한다
    // (codex 리뷰 P2: 종전 "실패는 캐시 불변" 단정을 교정)
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(DETAIL_KEY)?.isInvalidated).toBe(true);
  });

  it("404(13430, 대상 소멸)도 스테일 서버 상태로 보고 목록·상세를 재조회한다 (codex 리뷰 P2)", async () => {
    stubFetch(async () => errorEnvelope(13430, "승인 행사가 아닙니다", 404));
    const onFailed = vi.fn();
    const { result } = renderHook(() => useUnpublishEvent({ onFailed }), {
      wrapper,
    });

    result.current.mutate({ submissionId: 41, reason: "행사 정보 오류" });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].staleServerState).toBe(true);
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
  });

  it("그 외 실패(네트워크 등)는 캐시를 건드리지 않는다 (AC 9)", async () => {
    stubFetch(async () => errorEnvelope(500, "서버 오류", 500));
    const onFailed = vi.fn();
    const { result } = renderHook(() => useUnpublishEvent({ onFailed }), {
      wrapper,
    });

    result.current.mutate({ submissionId: 41, reason: "행사 정보 오류" });

    await waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
    expect(onFailed.mock.calls[0][0].alreadyUnpublished).toBe(false);
    expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(false);
  });
});
