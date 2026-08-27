import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { useRegionVideosQuery } from "./use-region-videos-query";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const VIDEO = {
  videoId: 7,
  gridId: "39064_112221",
  thumbnailUrl: null,
  processingStatus: "READY",
  durationSec: 24,
  createdAt: "2026-08-13T09:00:00Z",
  zoneName: "서면",
  zoneCell: "A-02",
};

/** 스텁이 요청 계약을 강제한다 — regionCode 없는 요청은 실패라 데이터 도착이 계약 준수의 증거다 */
const stubRegionVideos = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: Request) => Promise<Response>>(async (request) => {
      const url = new URL(request.url);
      if (
        url.pathname === "/api/collections/videos" &&
        url.searchParams.get("regionCode") === "2644056000"
      ) {
        return envelopeResponse([VIDEO]);
      }
      return new Response(null, { status: 500 });
    }),
  );
};

describe("useRegionVideosQuery — 동 단위 내 영상 조회 (기준 11·15)", () => {
  // 내 수집 영상은 사용자별 API다 (익명 401) — 기존 조회 단정은 로그인 전제로 고정 (MSG-474)
  beforeEach(signInForTest);

  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("regionCode의 영상 목록이 조회되어 언랩된다 (기준 11)", async () => {
    stubRegionVideos();

    const { result } = renderHook(() => useRegionVideosQuery("2644056000"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data?.[0]?.videoId).toBe(7);
  });

  it("regionCode가 없으면(코드 미해결) 영상 조회를 실행하지 않는다 (기준 11 방어)", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useRegionVideosQuery(null), {
      wrapper,
    });

    expect(result.current.isPending).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("조회 실패는 isError로 드러나 재시도 안내가 가능하다 (기준 15)", async () => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 500 }));

    const { result } = renderHook(() => useRegionVideosQuery("2644056000"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("비로그인이면 regionCode가 있어도 발사하지 않는다 — 익명 401 스팸 방지 (MSG-474 AC 14 계열)", async () => {
    signOutForTest();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useRegionVideosQuery("2644056000"), {
      wrapper,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);
  });
});
