import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { fcmTokenStorage } from "@/shared/storage";
import { stubFetch } from "@/test/stub-fetch";
import { usePushTokenStore } from "../model/push-token-store";
import { usePushTokenSync } from "./use-push-token-sync";
import {
  fetchFcmToken,
  getPermission,
  readPushCapabilities,
} from "./messaging";

/**
 * 셸 상주 자동 동기화 훅 (AC 1·2·3·8·13, test-first).
 * firebase는 격리 경계(api/messaging)를 모킹한다 — 스펙 명시(리스크: jsdom에
 * Notification·serviceWorker 부재). 네트워크(등록/해제 API)는 fetch 스텁 경계로 검증한다.
 */
vi.mock("./messaging", () => ({
  readPushCapabilities: vi.fn(() => ({
    hasNotification: true,
    hasServiceWorker: true,
    hasPushManager: true,
  })),
  getPermission: vi.fn<() => NotificationPermission | null>(() => "granted"),
  fetchFcmToken: vi.fn(async () => "tok-a"),
}));

const pathOf = (request: Request) => new URL(request.url).pathname;

beforeEach(() => {
  useAuthStore.setState({ accessToken: "t", isAuthenticated: true });
  fcmTokenStorage.clear();
  usePushTokenStore.setState({ token: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
  // resetAllMocks — mockReturnValue 오버라이드를 factory 기본 구현으로 되돌린다
  // (clearAllMocks는 호출 기록만 지워 테스트 간 오버라이드가 샜다)
  vi.resetAllMocks();
});

describe("usePushTokenSync — 기존 등록자 자동 동기화 (AC 1·2·3)", () => {
  it("granted && 보관 토큰 존재면 getToken 후 재등록 POST한다 — last_used_at 갱신 (AC 1)", async () => {
    fcmTokenStorage.save("tok-a");
    const received = stubFetch(() => new Response(null, { status: 200 }));

    renderHook(() => usePushTokenSync());

    await waitFor(() => expect(received).toHaveLength(1));
    expect(pathOf(received[0].request)).toBe("/api/notifications/tokens");
    expect(received[0].request.method).toBe("POST");
    expect(received[0].body).toEqual({ fcmToken: "tok-a", platform: "WEB" });
  });

  it("신규 토큰이 보관 토큰과 다르면(로테이션) 구토큰 DELETE 후 신규 토큰을 등록·보관한다 (AC 1)", async () => {
    fcmTokenStorage.save("tok-old");
    usePushTokenStore.setState({ token: "tok-old" });
    vi.mocked(fetchFcmToken).mockResolvedValue("tok-new");
    const received = stubFetch(() => new Response(null, { status: 200 }));

    renderHook(() => usePushTokenSync());

    await waitFor(() => expect(received).toHaveLength(2));
    expect(received[0].request.method).toBe("DELETE");
    expect(pathOf(received[0].request)).toBe("/api/notifications/tokens");
    expect(new URL(received[0].request.url).searchParams.get("fcmToken")).toBe(
      "tok-old",
    );
    expect(received[1].request.method).toBe("POST");
    expect(received[1].body).toEqual({ fcmToken: "tok-new", platform: "WEB" });
    await waitFor(() => expect(fcmTokenStorage.get()).toBe("tok-new"));
    expect(usePushTokenStore.getState().token).toBe("tok-new");
  });

  it("보관 토큰이 없으면 권한 요청·getToken·등록이 전혀 발생하지 않는다 (AC 2)", async () => {
    const received = stubFetch(() => new Response(null, { status: 200 }));

    renderHook(() => usePushTokenSync());

    // 발동했다면 microtask 몇 번 안에 fetchFcmToken이 호출된다 — 짧게 흘려보내고 부재 단정
    await Promise.resolve();
    expect(fetchFcmToken).not.toHaveBeenCalled();
    expect(received).toHaveLength(0);
  });

  it("비로그인 상태에서는 자동 동기화가 발생하지 않는다 (AC 3)", async () => {
    useAuthStore.setState({ accessToken: null, isAuthenticated: false });
    fcmTokenStorage.save("tok-a");
    const received = stubFetch(() => new Response(null, { status: 200 }));

    renderHook(() => usePushTokenSync());

    await Promise.resolve();
    expect(fetchFcmToken).not.toHaveBeenCalled();
    expect(received).toHaveLength(0);
  });

  it("권한이 granted가 아니면 보관 토큰이 있어도 동기화하지 않는다 (AC 1)", async () => {
    fcmTokenStorage.save("tok-a");
    vi.mocked(getPermission).mockReturnValue("default");
    const received = stubFetch(() => new Response(null, { status: 200 }));

    renderHook(() => usePushTokenSync());

    await Promise.resolve();
    expect(fetchFcmToken).not.toHaveBeenCalled();
    expect(received).toHaveLength(0);
  });

  it("미지원 브라우저면 자동 동기화를 스킵하고 크래시가 없다 (AC 8)", async () => {
    fcmTokenStorage.save("tok-a");
    vi.mocked(readPushCapabilities).mockReturnValue({
      hasNotification: false,
      hasServiceWorker: false,
      hasPushManager: false,
    });
    const received = stubFetch(() => new Response(null, { status: 200 }));

    renderHook(() => usePushTokenSync());

    await Promise.resolve();
    expect(fetchFcmToken).not.toHaveBeenCalled();
    expect(received).toHaveLength(0);
  });
});

describe("usePushTokenSync — 언마운트 경쟁 가드 (codex 리뷰 2)", () => {
  it("동기화 진행 중 언마운트되면 이후 단계(등록·보관)가 중단된다 — 로그아웃이 비운 보관을 재오염하지 않는다", async () => {
    fcmTokenStorage.save("tok-old");
    usePushTokenStore.setState({ token: "tok-old" });
    let resolveToken: ((token: string) => void) | undefined;
    vi.mocked(fetchFcmToken).mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveToken = resolve;
        }),
    );
    const received = stubFetch(() => new Response(null, { status: 200 }));
    const { unmount } = renderHook(() => usePushTokenSync());
    await waitFor(() => expect(resolveToken).toBeDefined());

    unmount();
    // 언마운트 원인(로그아웃)이 보관을 비웠다 — 늦은 setToken이 이걸 되살리면 안 된다
    fcmTokenStorage.clear();
    usePushTokenStore.setState({ token: null });
    resolveToken?.("tok-new");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(received).toHaveLength(0);
    expect(fcmTokenStorage.get()).toBeNull();
    expect(usePushTokenStore.getState().token).toBeNull();
  });
});

describe("usePushTokenSync — 실패 격리 (AC 13)", () => {
  it("등록 API 실패(5xx)는 콘솔 경고로만 남고 훅이 앱을 깨뜨리지 않는다 (AC 13)", async () => {
    fcmTokenStorage.save("tok-a");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubFetch(() => new Response(null, { status: 500 }));

    renderHook(() => usePushTokenSync());

    await waitFor(() => expect(warn).toHaveBeenCalled());
    // 실패해도 보관 토큰은 유지 — 다음 동기화가 자기 수복한다 (리스크 절)
    expect(fcmTokenStorage.get()).toBe("tok-a");
  });
});
