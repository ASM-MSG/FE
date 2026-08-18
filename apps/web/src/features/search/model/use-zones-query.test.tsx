import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { useZonesQuery } from "./use-zones-query";

const ZONE = {
  zoneKey: "seomyeon",
  name: "서면",
  regionCode: null,
  minGridY: 16850,
  maxGridY: 16853,
  minGridX: 11419,
  maxGridX: 11424,
  priority: 1,
};

/** 재마운트 간 캐시 계약 검증을 위해 QueryClient를 테스트 안에서 공유한다 */
const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

const stubZones = () =>
  vi.fn<(input: Request) => Promise<Response>>(async (request) => {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/zones") return envelopeResponse([ZONE]);
    return new Response(null, { status: 500 });
  });

describe("useZonesQuery — zones 세션 1회 캐시 (AC 4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("로그인 상태면 zones 목록이 언랩되어 도착한다 (AC 4)", async () => {
    vi.stubGlobal("fetch", stubZones());
    signInForTest();

    const { result } = renderHook(() => useZonesQuery(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].name).toBe("서면");
  });

  it("비로그인이면 zones 요청이 발사되지 않는다 (AC 4)", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useZonesQuery(), {
      wrapper: makeWrapper(),
    });

    expect(result.current).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("재마운트해도 세션 내 재요청이 없다 — staleTime·gcTime Infinity (AC 4)", async () => {
    const fetchSpy = stubZones();
    vi.stubGlobal("fetch", fetchSpy);
    signInForTest();
    const wrapper = makeWrapper();
    const first = renderHook(() => useZonesQuery(), { wrapper });
    await waitFor(() => expect(first.result.current).toHaveLength(1));
    first.unmount();

    const second = renderHook(() => useZonesQuery(), { wrapper });

    // 캐시가 그대로 도착하고 (Infinity — 재검증 refetch 없음) 요청은 총 1회다
    expect(second.result.current).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
