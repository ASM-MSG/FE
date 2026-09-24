import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "../../../test/envelope-response";

/**
 * 인기 검색어 옵션 (MSG-578 D6) — 형제 훅(use-place-search-query·use-zones-query)과 같은
 * QueryObserver 구동. `enabled`는 훅 인자라 여기서는 옵션 자체(경로·언랩)만 본다.
 */
const API_BASE = "https://api.test.local";
const TRENDING = [
  { rank: 1, keyword: "서면" },
  { rank: 2, keyword: "광안리" },
];

const observe = async (enabled: boolean) => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { trendingQueryOptions } = await import("./use-trending-query");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const observer = new QueryObserver(queryClient, {
    ...trendingQueryOptions(),
    enabled,
  });
  observer.subscribe(() => {});
  return observer;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("trendingQueryOptions — 인기 검색어 (S1)", () => {
  it("/api/search/trending 응답을 unwrapEnvelope로 순위·검색어 배열로 만든다", async () => {
    const fetchSpy = vi.fn(async (request: Request) =>
      new URL(request.url).pathname === "/api/search/trending"
        ? envelopeResponse(TRENDING)
        : new Response(null, { status: 500 }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const observer = await observe(true);
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().isSuccess).toBe(true),
    );

    expect(observer.getCurrentResult().data).toEqual(TRENDING);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("입력 중(enabled=false)에는 요청하지 않고 keywords는 undefined로 남는다", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const observer = await observe(false);

    expect(observer.getCurrentResult().fetchStatus).toBe("idle");
    expect(observer.getCurrentResult().data).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
