import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { useRegionGridsQuery } from "./use-region-grids-query";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const GRID = {
  gridId: "39064_112221",
  gridY: 39064,
  gridX: 112221,
  videoCount: 138,
  coverThumbnailUrl: null,
  coverDurationSec: 84,
  zoneName: "서면",
  zoneCell: "A-14",
};

/**
 * 스텁이 요청 계약을 강제한다 — 사용자 확정값 sort=LATEST·limit=20이 아닌 요청은
 * 실패 응답이라 데이터 도착 자체가 계약 준수의 증거다 (템플릿 ③ — URL 단정 대체).
 */
const stubRegionGrids = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: Request) => Promise<Response>>(async (request) => {
      const url = new URL(request.url);
      if (
        url.pathname === "/api/regions/2644056000/grids" &&
        url.searchParams.get("sort") === "LATEST" &&
        url.searchParams.get("limit") === "20"
      ) {
        return envelopeResponse({
          regionCode: "2644056000",
          regionName: "부전제1동",
          gridCount: 12,
          videoCount: 240,
          grids: [GRID],
        });
      }
      return new Response(null, { status: 500 });
    }),
  );
};

describe("useRegionGridsQuery — 행정동 격자 카드 조회 (AC 4·5·12)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("regionCode의 격자 리스트가 LATEST·limit 20으로 조회되어 언랩된다 (AC 4·5 — 사용자 확정값)", async () => {
    stubRegionGrids();

    const { result } = renderHook(() => useRegionGridsQuery("2644056000"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data?.regionName).toBe("부전제1동");
    expect(result.current.data?.grids[0]?.gridId).toBe("39064_112221");
  });

  it("regionCode가 없으면(행정동 밖) 격자 조회를 실행하지 않는다 (AC 12)", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useRegionGridsQuery(null), {
      wrapper,
    });

    expect(result.current.isPending).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
