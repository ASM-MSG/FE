import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { useExploreRegionsQuery } from "./use-explore-regions-query";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

afterEach(() => {
  vi.unstubAllGlobals();
  signOutForTest();
});

describe("useExploreRegionsQuery — 전체 지역 리스트 (AC 10, PR 리뷰 — 인증 게이트 일관화)", () => {
  it("비로그인이면 조회하지 않는다 — 보호 API 게이트를 훅이 소유한다 (호출부 enabled 함정 제거)", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useExploreRegionsQuery(), { wrapper });

    expect(result.current.isPending).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("로그인 상태면 커서 페이지의 items가 언랩되어 도착한다 (MSG-460 계약 변경)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        envelopeResponse({
          items: [
            {
              regionCode: "2644056000",
              regionName: "부전제1동",
              gridCount: 12,
            },
          ],
          hasNext: false,
          nextCursor: null,
        }),
      ),
    );
    signInForTest();

    const { result } = renderHook(() => useExploreRegionsQuery(), { wrapper });

    await waitFor(() =>
      expect(result.current.regions?.[0]?.regionName).toBe("부전제1동"),
    );
    expect(result.current.regions?.[0]?.gridCount).toBe(12);
  });
});
