import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { useGridRegionStatQuery } from "./use-region-stat-query";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const STAT = {
  regionCode: "2644056000",
  regionName: "부전제1동",
  parentCode: "26440",
  collectedCount: 6,
  totalCount: 120,
  progressRate: 5,
  updatedAt: "2026-08-14T00:00:00Z",
};

describe("useGridRegionStatQuery — 격자 → 행정동 코드·수집률 (기준 11)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("대표 격자 id로 그 격자 중심 행정동의 regionCode를 얻는다 — collections/grids 응답의 명세 갭을 메운다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(input: Request) => Promise<Response>>(async (request) => {
        const url = new URL(request.url);
        if (
          url.pathname === "/api/regions/stats/by-grid" &&
          url.searchParams.get("gridId") === "39064_112221"
        ) {
          return envelopeResponse(STAT);
        }
        return new Response(null, { status: 500 });
      }),
    );

    const { result } = renderHook(
      () => useGridRegionStatQuery("39064_112221"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data?.regionCode).toBe("2644056000");
  });

  it("대표 격자가 없으면(동 미선택) 조회를 실행하지 않는다", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useGridRegionStatQuery(null), {
      wrapper,
    });

    expect(result.current.isPending).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
