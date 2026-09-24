import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "../../../test/envelope-response";
import { SEOMYEON_ZONE as SEOMYEON } from "../../../test/zone-fixture";

/**
 * L3 — zones 세션 1회 캐시 계약 (MSG-578 D6). 같은 `QueryClient`에서 옵저버를 두 번
 * 구독(= 검색 화면 재마운트)해도 요청은 1회여야 한다 — staleTime·gcTime Infinity.
 */
const API_BASE = "https://api.test.local";

const loadOptions = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { zonesQueryOptions, zonesOrEmpty } = await import("./use-zones-query");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const observe = () => {
    const observer = new QueryObserver(queryClient, zonesQueryOptions());
    const unsubscribe = observer.subscribe(() => {});
    return { observer, unsubscribe };
  };
  return { observe, zonesOrEmpty };
};

const stubZones = () =>
  vi.fn(async (request: Request) => {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/zones") return envelopeResponse([SEOMYEON]);
    return new Response(null, { status: 500 });
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("zonesQueryOptions — zones 세션 1회 캐시 (L3)", () => {
  it("재구독(화면 재마운트)해도 /api/zones 요청은 총 1회다 — staleTime·gcTime Infinity", async () => {
    const fetchSpy = stubZones();
    vi.stubGlobal("fetch", fetchSpy);
    const { observe } = await loadOptions();
    const first = observe();
    await vi.waitFor(() =>
      expect(first.observer.getCurrentResult().isSuccess).toBe(true),
    );
    first.unsubscribe();

    const second = observe();

    expect(second.observer.getCurrentResult().data).toEqual([SEOMYEON]);
    expect(second.observer.getCurrentResult().fetchStatus).toBe("idle");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("미도착이면 빈 배열로 폴백한다 — 격자 섹션이 조용히 비활성", async () => {
    vi.stubGlobal("fetch", stubZones());
    const { observe, zonesOrEmpty } = await loadOptions();

    const { observer } = observe();

    expect(zonesOrEmpty(observer.getCurrentResult().data)).toEqual([]);
  });
});
