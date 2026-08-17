import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { useLocationConsentGate } from "./use-location-consent-gate";

/**
 * 동의 게이트 훅 (MSG-407 기준 1·2·3, 추정 4) — getMe(locationConsent) + 인증 게이트의
 * 쿼리 계약. 화면 배선(전면 렌더 교체)은 app-layout-consent-gate 스모크의 몫.
 */

const SERVER_ME = {
  email: "fillmapper@fillmap.app",
  nickname: "필맵퍼",
  profileImageUrl: null,
  createdAt: "2026-05-02T09:00:00",
  locationConsent: false,
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  signOutForTest();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useLocationConsentGate — getMe locationConsent 게이트 (MSG-407)", () => {
  it("로그인 상태에서 locationConsent=false면 게이트가 켜진다 (기준 1)", async () => {
    signInForTest();
    stubFetch(() => envelopeResponse(SERVER_ME));

    const { result } = renderHook(() => useLocationConsentGate(), { wrapper });

    await waitFor(() => expect(result.current).toBe(true));
  });

  it("locationConsent=true면 게이트가 켜지지 않는다 (기준 2)", async () => {
    signInForTest();
    const received = stubFetch(() =>
      envelopeResponse({ ...SERVER_ME, locationConsent: true }),
    );

    const { result } = renderHook(() => useLocationConsentGate(), { wrapper });

    await waitFor(() => expect(received.length).toBe(1));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("비로그인 상태에서는 게이트가 꺼져 있고 getMe를 발사하지 않는다 (기준 3 — 익명 401 게이트 관례)", async () => {
    const received = stubFetch(() => envelopeResponse(SERVER_ME));

    const { result } = renderHook(() => useLocationConsentGate(), { wrapper });

    expect(result.current).toBe(false);
    // 미발사는 즉시 단정 불가(비동기 발사 여지) — 마이크로태스크 소진 후 확인
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(received.length).toBe(0);
  });

  it("getMe 실패 시 게이트가 켜지지 않는다 — 성공 응답의 false에만 반응 (추정 4)", async () => {
    signInForTest();
    const received = stubFetch(() => new Response(null, { status: 500 }));

    const { result } = renderHook(() => useLocationConsentGate(), { wrapper });

    await waitFor(() => expect(received.length).toBeGreaterThan(0));
    expect(result.current).toBe(false);
  });
});
