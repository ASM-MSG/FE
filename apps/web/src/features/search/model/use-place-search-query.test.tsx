import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { usePlaceSearchQuery } from "./use-place-search-query";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const PLACE = {
  name: "서면역",
  address: "부산 부산진구 중앙대로 지하 730",
  lat: 35.1579,
  lng: 129.0594,
  gridId: "39064_112221",
  zoneName: "서면",
  zoneCell: "A-14",
};

/** 스텁이 경로·검색어 계약을 강제한다 — q가 실리지 않으면 실패 응답 */
const stubPlaces = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: Request) => Promise<Response>>(async (request) => {
      const url = new URL(request.url);
      if (
        url.pathname === "/api/search/places" &&
        url.searchParams.get("q") === "서면"
      ) {
        return envelopeResponse([PLACE]);
      }
      return new Response(null, { status: 500 });
    }),
  );
};

describe("usePlaceSearchQuery — 장소 검색 (AC 15·17)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("검색어 입력 시 디바운스 후 장소 결과(장소명·주소)가 언랩되어 도착한다 (AC 15)", async () => {
    stubPlaces();
    const { result, rerender } = renderHook(
      ({ input }) => usePlaceSearchQuery(input, true),
      { wrapper, initialProps: { input: "" } },
    );

    rerender({ input: "서면" });

    await waitFor(
      () => expect(result.current.places?.[0]?.name).toBe("서면역"),
      { timeout: 2000 },
    );
    expect(result.current.places?.[0]?.address).toBe(
      "부산 부산진구 중앙대로 지하 730",
    );
  });

  it("빈 검색어는 조회하지 않는다 (스펙 — 빈 q 비활성)", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => usePlaceSearchQuery("  ", true), {
      wrapper,
    });

    expect(result.current.places).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("요청이 실패하면 isError로 확정된다 (AC 17)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 502 })),
    );

    const { result } = renderHook(() => usePlaceSearchQuery("서면", true), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 2000,
    });
    expect(result.current.places).toBeUndefined();
  });
});
