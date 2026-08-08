import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Bounds } from "@/entities/cell";
import { useOccupiedGridsQuery } from "./use-occupied-grids-query";

/**
 * 점령 격자 훅의 **실제 요청 형태** 단정 (MSG-325 브라우저 검증 환류).
 * 순수 헬퍼 테스트만으로는 훅이 조립하는 쿼리스트링을 볼 수 없어, 첫 페이지 요청에
 * 빈 `cursor=`가 실려 서버가 400을 주는 결함을 놓쳤다 — 실요청을 직접 단정한다.
 */
const SEOMYEON_VIEWPORT: Bounds = {
  sw: { lat: 35.15, lng: 129.05 },
  ne: { lat: 35.16, lng: 129.06 },
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

const stubGrids = () => {
  const fetchMock = vi.fn<(input: Request) => Promise<Response>>(
    async () =>
      new Response(
        JSON.stringify({
          developCode: 0,
          message: "ok",
          data: { grids: [], nextCursor: null },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useOccupiedGridsQuery — 실요청 형태", () => {
  it("첫 페이지 요청에 cursor 파라미터를 싣지 않는다 — 빈 cursor는 서버가 400으로 거부한다", async () => {
    const fetchMock = stubGrids();

    renderHook(() => useOccupiedGridsQuery(SEOMYEON_VIEWPORT), { wrapper });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = new URL(fetchMock.mock.calls[0][0].url);
    expect(url.searchParams.has("cursor")).toBe(false);
    expect(url.searchParams.get("swLat")).toBe("35.15");
    expect(url.searchParams.get("neLng")).toBe("129.06");
  });

  it("요청 대상이 아닌 뷰포트(null)에서는 아무 요청도 보내지 않는다", async () => {
    const fetchMock = stubGrids();

    renderHook(() => useOccupiedGridsQuery(null), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
