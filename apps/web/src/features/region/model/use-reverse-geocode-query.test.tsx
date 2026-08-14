import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { useReverseGeocodeQuery } from "./use-reverse-geocode-query";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const SEOMYEON_CENTER = { lat: 35.1579, lng: 129.0594 };

/** 스텁이 경로 계약을 강제한다 — reverse-geocode 외 경로는 실패 응답 */
const stubReverseGeocode = (data: unknown) => {
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: Request) => Promise<Response>>(async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/regions/reverse-geocode")
        return envelopeResponse(data);
      return new Response(null, { status: 500 });
    }),
  );
};

describe("useReverseGeocodeQuery — 지도 중심 행정동 판별 (AC 4·12)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("지도 중심 좌표의 행정동 응답이 언랩되어 도착한다 (AC 4)", async () => {
    stubReverseGeocode({
      regionCode: "2644056000",
      regionName: "부전제1동",
      parentCode: "2644000000",
    });

    const { result } = renderHook(
      () => useReverseGeocodeQuery(SEOMYEON_CENTER),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isResolved).toBe(true));
    expect(result.current.region?.regionName).toBe("부전제1동");
    expect(result.current.region?.regionCode).toBe("2644056000");
  });

  it("행정동 밖(바다 등)이면 region이 null로 확정된다 (AC 12)", async () => {
    stubReverseGeocode(null);

    const { result } = renderHook(
      () => useReverseGeocodeQuery(SEOMYEON_CENTER),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isResolved).toBe(true));
    expect(result.current.region).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it("center가 null(비로그인 게이트)이면 조회하지 않는다", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useReverseGeocodeQuery(null), {
      wrapper,
    });

    expect(result.current.isResolved).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("이동 후 실패 시 직전 성공값 잔존 여부 (PR 리뷰 검증 — stale 재검색 버튼)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("새 중심 조회가 실패하면 직전 성공 지역이 현재 지역(region)으로 남지 않는다", async () => {
    // 최초 중심 조회는 성공, 이동 후 조회는 실패 — keepPreviousData 하에서의 에러 상태 계약
    let fails = false;
    vi.stubGlobal(
      "fetch",
      vi.fn<(input: Request) => Promise<Response>>(async () =>
        fails
          ? new Response(null, { status: 500 })
          : envelopeResponse({
              regionCode: "2644056000",
              regionName: "부전제1동",
              parentCode: "2644000000",
            }),
      ),
    );
    const { result, rerender } = renderHook(
      ({ center }: { center: { lat: number; lng: number } }) =>
        useReverseGeocodeQuery(center),
      { wrapper, initialProps: { center: SEOMYEON_CENTER } },
    );
    await waitFor(() =>
      expect(result.current.region?.regionCode).toBe("2644056000"),
    );

    fails = true;
    rerender({ center: { lat: 35.2, lng: 129.2 } });

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 3000,
    });
    // 실패 시 직전 성공값이 남으면 에러 안내와 stale "장소 불러오기" 버튼이 동시 노출된다
    expect(result.current.region).toBeNull();
  });
});
