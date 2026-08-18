import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { usePreferencesQuery } from "./use-preferences-query";

/**
 * 알림 preferences 조회 훅 (MSG-409 AC 4·5·11, test-first) — 생성 옵션 + 봉투 언랩 +
 * 카탈로그 병합 select (use-profile-query 선례). 에러 시나리오가 있어 retry:false.
 */
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usePreferencesQuery — GET /api/notifications/preferences (AC 4·5)", () => {
  it("진입 시 GET이 호출되고 병합된 그룹 2개(3행·2행)가 온다 (AC 4)", async () => {
    const received = stubFetch(() =>
      envelopeResponse({
        preferences: [{ category: "WEEKLY", enabled: false }],
      }),
    );

    const { result } = renderHook(() => usePreferencesQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(received).toHaveLength(1);
    expect(new URL(received[0].request.url).pathname).toBe(
      "/api/notifications/preferences",
    );
    expect(result.current.data?.map((g) => g.items.length)).toEqual([3, 2]);
  });

  it("서버 응답 값이 각 행에 반영되고 누락 카테고리는 true다 (AC 4·5)", async () => {
    stubFetch(() =>
      envelopeResponse({
        preferences: [{ category: "WEEKLY", enabled: false }],
      }),
    );

    const { result } = renderHook(() => usePreferencesQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const items = result.current.data!.flatMap((g) => g.items);
    expect(items.find((i) => i.category === "WEEKLY")?.enabled).toBe(false);
    expect(items.find((i) => i.category === "VIDEO")?.enabled).toBe(true);
  });

  it("조회 실패면 isError다 — 오류 게이트 근거 (AC 11)", async () => {
    stubFetch(() => new Response(null, { status: 500 }));

    const { result } = renderHook(() => usePreferencesQuery(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
