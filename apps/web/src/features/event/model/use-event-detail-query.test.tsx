import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { useEventDetailQuery } from "./use-event-detail-query";

const DETAIL_DTO = {
  occurrenceId: 7,
  seriesId: 1,
  title: "포켓몬 메가페스타 부산",
  startsAt: "2026-07-17T10:00:00",
  endsAt: "2026-08-09T21:00:00",
  uploadClosesAt: "2026-09-08T21:00:00",
  status: "LIVE",
  notificationOn: false,
  previousOccurrences: [],
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useEventDetailQuery — 행사 회차 상세 조회 (AC 1·10)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("행사방이 열리면(occurrenceId 존재) 상세를 조회해 제목·기간 재료를 준다 (AC 1)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => envelopeResponse(DETAIL_DTO)),
    );

    const { result } = renderHook(() => useEventDetailQuery(7), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.detail?.title).toBe("포켓몬 메가페스타 부산");
    expect(result.current.detail?.startsAt).toBe("2026-07-17T10:00:00");
  });

  it("조회 실패(404·13404 포함)는 isError로 수렴한다 — RetryNotice 재료 (AC 10)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => errorEnvelope(13404, "not found", 404)),
    );

    const { result } = renderHook(() => useEventDetailQuery(7), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.detail).toBeNull();
  });

  it("행사방이 닫혀 있으면(null) 조회하지 않는다", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderHook(() => useEventDetailQuery(null), { wrapper });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
