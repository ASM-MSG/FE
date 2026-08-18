import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { useUploadHistoryQuery } from "./use-collection-query";

/**
 * 업로드 잔디 이력 쿼리 훅 (MSG-414 AC 3) — 이 API의 첫 사용처라 재사용할 기존
 * 훅·키가 없다. 봉투 언랩 계약만 단정한다(인증 게이트는 라우트 RequireAuth 몫,
 * 기존 훅 3종은 커버리지 공백으로 존치 — 이 파일은 신규 훅만 다룬다).
 */

// 테스트마다 새 QueryClient + retry: false (에러 시나리오 타임아웃 방지)
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useUploadHistoryQuery — 업로드 이력 조회 (AC 3)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GET /api/collections/upload-history 봉투를 언랩해 희소 이력 배열을 돌려준다 (AC 3)", async () => {
    vi.stubGlobal("fetch", async (request: Request) => {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/collections/upload-history") {
        return envelopeResponse([
          { uploadDate: "2026-08-18", uploadCount: 2 },
          { uploadDate: "2026-08-10", uploadCount: 1 },
        ]);
      }
      return new Response(null, { status: 404 });
    });

    const { result } = renderHook(() => useUploadHistoryQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      { uploadDate: "2026-08-18", uploadCount: 2 },
      { uploadDate: "2026-08-10", uploadCount: 1 },
    ]);
  });

  it("실패(5xx) 응답이면 에러 상태가 된다 — 기록 탭 게이트의 입력 (AC 10 재료)", async () => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 500 }));

    const { result } = renderHook(() => useUploadHistoryQuery(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
