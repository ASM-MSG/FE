import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toProfileData } from "@/entities/profile";
import { getMeQueryKey } from "@/shared/api/generated/@tanstack/react-query.gen";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { useProfileQuery } from "./use-profile-query";

/**
 * 프로필 조회 실 API 전환 (MSG-329 A1·A2 재설계) — 구 mock 소스(MOCK_PROFILE 반환)와
 * 수동 queryKey ["profile"]을 폐기하고 생성 옵션(getMeOptions)+unwrapEnvelope로 대체한다.
 */

const createHarness = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useProfileQuery — GET /api/users/me (A1)", () => {
  it("생성 옵션 경유로 /api/users/me를 호출하고 응답 nickname·email을 ProfileData로 매핑한다", async () => {
    const received = stubFetch(() =>
      envelopeResponse({ email: "fillmapper@fillmap.app", nickname: "필맵퍼" }),
    );
    const { wrapper } = createHarness();

    const { result } = renderHook(() => useProfileQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(new URL(received[0].request.url).pathname).toBe("/api/users/me");
    expect(result.current.data).toEqual({
      nickname: "필맵퍼",
      email: "fillmapper@fillmap.app",
      locationEnabled: true,
    });
  });

  it("수동 queryKey ['profile']이 아니라 생성 getMeQueryKey로 캐시된다 (A1)", async () => {
    stubFetch(() => envelopeResponse({ email: null, nickname: "필맵퍼" }));
    const { queryClient, wrapper } = createHarness();

    const { result } = renderHook(() => useProfileQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryState(getMeQueryKey())).toBeDefined();
    expect(queryClient.getQueryState(["profile"])).toBeUndefined();
  });

  it("email null(카카오 가입)은 null 그대로 매핑된다 — 화면은 이메일 줄을 렌더하지 않는다 (A2)", async () => {
    stubFetch(() => envelopeResponse({ email: null, nickname: "카카오유저" }));
    const { wrapper } = createHarness();

    const { result } = renderHook(() => useProfileQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.email).toBeNull();
  });
});

describe("toProfileData — 명세 응답 → 화면 계약 매핑 (A1·A6)", () => {
  it("locationEnabled는 기존 클라이언트 값(켜짐)을 유지한다 — 서버 반영 없음 (A6)", () => {
    expect(toProfileData({ email: null, nickname: "필맵퍼" })).toEqual({
      email: null,
      nickname: "필맵퍼",
      locationEnabled: true,
    });
  });
});
