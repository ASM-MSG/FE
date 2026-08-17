import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { getMeQueryKey } from "@/shared/api/generated/@tanstack/react-query.gen";
import { deviceIdStorage } from "@/shared/storage";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import {
  useDeleteAccount,
  useRemoveProfileImage,
  useUpdateLocationConsent,
  useUpdateNickname,
} from "./use-profile-mutations";

/**
 * 프로필 mutation 훅 (MSG-329 A8·A9·A11, test-first) — use-auth-mutations 패턴 미러.
 * 생성 SDK mutation 경유를 fetch 목(stub-fetch 공용 헬퍼)의 URL(pathname)·메서드·바디로 검증한다.
 */

const createHarness = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

const pathnameOf = (request: Request) => new URL(request.url).pathname;

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, isAuthenticated: false });
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useUpdateNickname (A8·A9)", () => {
  it("PUT /api/users/me/nickname을 호출하고, 성공 시 getMe 쿼리를 invalidate해 헤더 닉네임이 갱신된다 (A8)", async () => {
    const received = stubFetch(() =>
      envelopeResponse({ email: null, nickname: "새닉네임" }),
    );
    const { queryClient, wrapper } = createHarness();
    // 프로필 캐시 시드 — invalidate 대상 확인용 (수동 ["profile"] 키가 아니라 생성 키)
    queryClient.setQueryData(getMeQueryKey(), {
      developCode: 0,
      message: "ok",
      data: { email: null, nickname: "이전닉네임" },
    });
    const onSaved = vi.fn();

    const { result } = renderHook(() => useUpdateNickname({ onSaved }), {
      wrapper,
    });
    act(() => {
      result.current.mutate("새닉네임");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(pathnameOf(received[0].request)).toBe("/api/users/me/nickname");
    expect(received[0].request.method).toBe("PUT");
    expect(received[0].body).toEqual({ nickname: "새닉네임" });
    expect(queryClient.getQueryState(getMeQueryKey())?.isInvalidated).toBe(
      true,
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("저장 실패 시 onSaved가 불리지 않고 에러 상태가 된다 — 모달은 닫히지 않고 재시도 가능 (A9)", async () => {
    stubFetch(
      () =>
        new Response(
          JSON.stringify({ developCode: 4000, message: "잘못된 요청" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
    );
    const { wrapper } = createHarness();
    const onSaved = vi.fn();

    const { result } = renderHook(() => useUpdateNickname({ onSaved }), {
      wrapper,
    });
    act(() => {
      result.current.mutate("한");
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe("useUpdateLocationConsent (MSG-407 기준 8·9·13)", () => {
  it("PUT /api/users/me/location-consent {consented}를 호출하고, 성공 시 getMe를 invalidate해 캐시 갱신 경유로 게이트·화면이 반영된다 (기준 8·13)", async () => {
    const received = stubFetch(() =>
      envelopeResponse({
        email: null,
        nickname: "필맵퍼",
        profileImageUrl: null,
        createdAt: "2026-05-02T09:00:00",
        locationConsent: true,
      }),
    );
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(getMeQueryKey(), {
      developCode: 0,
      message: "ok",
      data: { locationConsent: false },
    });
    const onSaved = vi.fn();

    const { result } = renderHook(() => useUpdateLocationConsent({ onSaved }), {
      wrapper,
    });
    act(() => {
      result.current.mutate(true);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(pathnameOf(received[0].request)).toBe(
      "/api/users/me/location-consent",
    );
    expect(received[0].request.method).toBe("PUT");
    expect(received[0].body).toEqual({ consented: true });
    expect(queryClient.getQueryState(getMeQueryKey())?.isInvalidated).toBe(
      true,
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("PUT 실패 시 onSaved가 불리지 않고 에러 상태가 된다 — 게이트·모달이 유지되고 재시도 가능 (기준 9)", async () => {
    stubFetch(() => new Response(null, { status: 500 }));
    const { wrapper } = createHarness();
    const onSaved = vi.fn();

    const { result } = renderHook(() => useUpdateLocationConsent({ onSaved }), {
      wrapper,
    });
    act(() => {
      result.current.mutate(true);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe("useRemoveProfileImage (MSG-407 기준 18·20)", () => {
  it("DELETE /api/users/me/profile-image를 호출하고, 성공 시 getMe를 invalidate해 아바타가 기본 이미지로 갱신된다 (기준 18)", async () => {
    const received = stubFetch(() =>
      envelopeResponse({
        email: null,
        nickname: "필맵퍼",
        profileImageUrl: null,
        createdAt: "2026-05-02T09:00:00",
        locationConsent: true,
      }),
    );
    const { queryClient, wrapper } = createHarness();
    queryClient.setQueryData(getMeQueryKey(), {
      developCode: 0,
      message: "ok",
      data: { profileImageUrl: "https://cdn.fillmap.test/profile/me.png" },
    });

    const { result } = renderHook(() => useRemoveProfileImage(), { wrapper });
    act(() => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(pathnameOf(received[0].request)).toBe("/api/users/me/profile-image");
    expect(received[0].request.method).toBe("DELETE");
    expect(queryClient.getQueryState(getMeQueryKey())?.isInvalidated).toBe(
      true,
    );
  });

  it("DELETE 실패 시 에러 상태가 된다 — 모달이 유지되고 재시도 가능 (기준 20)", async () => {
    stubFetch(() => new Response(null, { status: 500 }));
    const { wrapper } = createHarness();

    const { result } = renderHook(() => useRemoveProfileImage(), { wrapper });
    act(() => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useDeleteAccount (A11)", () => {
  it("확인 시 DELETE /api/users/me → 성공하면 토큰·디바이스 ID·쿼리 캐시를 비우고 onDeleted(홈 이동)를 부른다", async () => {
    const received = stubFetch(() => new Response(null, { status: 200 }));
    const { queryClient, wrapper } = createHarness();
    useAuthStore.getState().setAccessToken("session-token");
    deviceIdStorage.save("device-1");
    queryClient.setQueryData(getMeQueryKey(), { cached: true });
    const onDeleted = vi.fn();

    const { result } = renderHook(() => useDeleteAccount({ onDeleted }), {
      wrapper,
    });
    act(() => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(pathnameOf(received[0].request)).toBe("/api/users/me");
    expect(received[0].request.method).toBe("DELETE");
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    // 비가역 삭제의 로컬 흔적 정리 — deviceIdStorage도 함께 비운다 (스펙 추정 6 확정)
    expect(deviceIdStorage.get()).toBeNull();
    expect(queryClient.getQueryData(getMeQueryKey())).toBeUndefined();
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("삭제 실패 시 세션이 유지되고 onDeleted가 불리지 않는다 — 모달에 오류가 남는다", async () => {
    stubFetch(() => new Response(null, { status: 500 }));
    const { queryClient, wrapper } = createHarness();
    useAuthStore.getState().setAccessToken("session-token");
    queryClient.setQueryData(getMeQueryKey(), { cached: true });
    const onDeleted = vi.fn();

    const { result } = renderHook(() => useDeleteAccount({ onDeleted }), {
      wrapper,
    });
    act(() => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(queryClient.getQueryData(getMeQueryKey())).toEqual({ cached: true });
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
