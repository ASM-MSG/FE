import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import {
  VIEWER_COUNT_REFETCH_MS,
  useViewerCountQuery,
} from "./use-viewer-count-query";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useViewerCountQuery — 실시간 시청 인원 30초 폴링 (AC 3·4)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("시청 인원을 조회해 값을 준다 — 0도 표시 대상 값이다 (AC 3)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => envelopeResponse({ viewerCount: 0 })),
    );

    const { result } = renderHook(() => useViewerCountQuery(7), { wrapper });

    await waitFor(() => expect(result.current.viewerCount).toBe(0));
  });

  it("30초 refetchInterval로 재조회한다 (AC 3 — 확정 1)", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn(async () => envelopeResponse({ viewerCount: 3 }));
    vi.stubGlobal("fetch", fetchSpy);

    renderHook(() => useViewerCountQuery(7), { wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(VIEWER_COUNT_REFETCH_MS);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("viewerCount null(캐시 장애)은 null 그대로 준다 — 표시만 생략 (AC 4)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => envelopeResponse({ viewerCount: null })),
    );

    const { result } = renderHook(() => useViewerCountQuery(7), { wrapper });

    await waitFor(() =>
      expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(0),
    );
    await waitFor(() => expect(result.current.viewerCount).toBeNull());
  });

  it("조회 실패는 null로 수렴하고 폴링은 계속돼 다음 주기에 재시도된다 (AC 4)", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn(async () => errorEnvelope(500, "boom", 500));
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useViewerCountQuery(7), { wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(result.current.viewerCount).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(VIEWER_COUNT_REFETCH_MS);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("행사방이 닫혀 있으면(null) 조회하지 않는다 (AC 3 — 열림 동안만)", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderHook(() => useViewerCountQuery(null), { wrapper });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
