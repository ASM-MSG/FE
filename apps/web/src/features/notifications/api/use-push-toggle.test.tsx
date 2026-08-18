import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fcmTokenStorage } from "@/shared/storage";
import { queryWrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { usePushNoticeStore } from "../model/push-notice-store";
import { usePushTokenStore } from "../model/push-token-store";
import { usePushToggle } from "./use-push-toggle";
import {
  fetchFcmToken,
  getPermission,
  readPushCapabilities,
  requestPermission,
} from "./messaging";

/**
 * 프로필 "알림 받기" 토글 훅 (AC 4·5·6·7·8·13, test-first).
 * firebase는 격리 경계(api/messaging)를 모킹한다 — 스펙 명시. 등록/해제 API는
 * fetch 스텁 경계로 검증한다. 에러 시나리오가 있어 retry:false 클라이언트를 쓴다.
 */
vi.mock("./messaging", () => ({
  readPushCapabilities: vi.fn(() => ({
    hasNotification: true,
    hasServiceWorker: true,
    hasPushManager: true,
  })),
  getPermission: vi.fn<() => NotificationPermission | null>(() => "default"),
  requestPermission: vi.fn(async () => "granted" as NotificationPermission),
  fetchFcmToken: vi.fn(async () => "tok-1"),
}));

const pathOf = (request: Request) => new URL(request.url).pathname;

beforeEach(() => {
  fcmTokenStorage.clear();
  usePushTokenStore.setState({ token: null });
  // 안내 채널은 전역 스토어(PR #60 리뷰 3 — PushNoticeHost 단일 스택) — 테스트 간 리셋
  usePushNoticeStore.setState({ toggleNotice: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
  // resetAllMocks — mockReturnValue 오버라이드를 factory 기본 구현으로 되돌린다
  // (clearAllMocks는 호출 기록만 지워 테스트 간 오버라이드가 샜다)
  vi.resetAllMocks();
});

describe("usePushToggle — 토글 표시 상태 (AC 4·8)", () => {
  it("권한 granted && 보관 토큰 존재면 ON으로 표시된다 (AC 4)", () => {
    vi.mocked(getPermission).mockReturnValue("granted");
    fcmTokenStorage.save("tok-1");

    const { result } = renderHook(() => usePushToggle(), {
      wrapper: queryWrapper,
    });

    expect(result.current.checked).toBe(true);
    expect(result.current.supported).toBe(true);
  });

  it("권한만 있고 보관 토큰이 없으면 OFF다 (AC 4)", () => {
    vi.mocked(getPermission).mockReturnValue("granted");

    const { result } = renderHook(() => usePushToggle(), {
      wrapper: queryWrapper,
    });

    expect(result.current.checked).toBe(false);
  });

  it("미지원 브라우저면 supported=false다 — 행 비활성 근거 (AC 8)", () => {
    vi.mocked(readPushCapabilities).mockReturnValue({
      hasNotification: false,
      hasServiceWorker: false,
      hasPushManager: false,
    });

    const { result } = renderHook(() => usePushToggle(), {
      wrapper: queryWrapper,
    });

    expect(result.current.supported).toBe(false);
    expect(result.current.checked).toBe(false);
  });
});

describe("usePushToggle — 토글 ON (AC 5·6·13)", () => {
  it("ON: 권한 요청 granted면 getToken → POST 등록 → 보관 → ON 반영 (AC 5)", async () => {
    // 권한 판독은 처음부터 granted여도 보관 토큰이 없으면 OFF다(AC 4) — ON 전이는
    // 등록 성공·보관이 만든다. 판독 모킹을 렌더 전에 고정해야 재렌더 시 반영된다
    vi.mocked(getPermission).mockReturnValue("granted");
    const received = stubFetch(() => new Response(null, { status: 200 }));
    const { result } = renderHook(() => usePushToggle(), {
      wrapper: queryWrapper,
    });
    expect(result.current.checked).toBe(false);

    act(() => result.current.setEnabled(true));

    await waitFor(() => expect(received).toHaveLength(1));
    expect(pathOf(received[0].request)).toBe("/api/notifications/tokens");
    expect(received[0].request.method).toBe("POST");
    expect(received[0].body).toEqual({ fcmToken: "tok-1", platform: "WEB" });
    expect(requestPermission).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(fcmTokenStorage.get()).toBe("tok-1"));
    await waitFor(() => expect(result.current.checked).toBe(true));
  });

  it("권한 denied면 토글이 OFF로 유지되고 브라우저 설정 안내가 노출된다 (AC 6)", async () => {
    vi.mocked(requestPermission).mockResolvedValue("denied");
    const received = stubFetch(() => new Response(null, { status: 200 }));
    const { result } = renderHook(() => usePushToggle(), {
      wrapper: queryWrapper,
    });

    act(() => result.current.setEnabled(true));

    // 안내는 전역 스토어로 push된다 — 사용자 노출·닫기는 PushNoticeHost 스모크가 고정 (PR #60 리뷰 3)
    await waitFor(() =>
      expect(usePushNoticeStore.getState().toggleNotice).toBe("denied"),
    );
    expect(fetchFcmToken).not.toHaveBeenCalled();
    expect(received).toHaveLength(0);
    expect(result.current.checked).toBe(false);
    expect(fcmTokenStorage.get()).toBeNull();
  });

  it("등록 POST가 실패하면 토큰을 보관하지 않아 OFF로 남고 오류 안내가 노출된다 (AC 13 + codex 리뷰 3)", async () => {
    vi.mocked(getPermission).mockReturnValue("granted");
    stubFetch(() => new Response(null, { status: 500 }));
    const { result } = renderHook(() => usePushToggle(), {
      wrapper: queryWrapper,
    });

    act(() => result.current.setEnabled(true));

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(fcmTokenStorage.get()).toBeNull();
    expect(result.current.checked).toBe(false);
    // 조용한 실패 금지 — denied 안내와 같은 토스트 관례의 오류 안내 (리뷰 3)
    expect(usePushNoticeStore.getState().toggleNotice).toBe("error");
  });
});

describe("usePushToggle — 토글 OFF (AC 7)", () => {
  it("OFF: 보관 토큰으로 DELETE 후 보관을 비우고 OFF 반영 (AC 7)", async () => {
    vi.mocked(getPermission).mockReturnValue("granted");
    fcmTokenStorage.save("tok-1");
    const received = stubFetch(() => new Response(null, { status: 200 }));
    const { result } = renderHook(() => usePushToggle(), {
      wrapper: queryWrapper,
    });
    expect(result.current.checked).toBe(true);

    act(() => result.current.setEnabled(false));

    await waitFor(() => expect(received).toHaveLength(1));
    expect(received[0].request.method).toBe("DELETE");
    expect(pathOf(received[0].request)).toBe("/api/notifications/tokens");
    expect(new URL(received[0].request.url).searchParams.get("fcmToken")).toBe(
      "tok-1",
    );
    await waitFor(() => expect(result.current.checked).toBe(false));
    expect(fcmTokenStorage.get()).toBeNull();
  });

  it("DELETE가 실패하면 보관·ON을 유지하고 오류 안내를 노출한다 — 재시도 가능 상태 (AC 7 정정, codex 리뷰 1)", async () => {
    // 구 단정("실패해도 보관을 비운다")은 리뷰로 정정 — 실패 시 비우면 서버에 토큰이
    // 남아 푸시는 계속 오는데 UI만 OFF가 되고, 자동 동기화(보관 토큰 전제)의 재해제
    // 경로가 영구 소멸한다
    vi.mocked(getPermission).mockReturnValue("granted");
    fcmTokenStorage.save("tok-1");
    stubFetch(() => new Response(null, { status: 500 }));
    const { result } = renderHook(() => usePushToggle(), {
      wrapper: queryWrapper,
    });

    act(() => result.current.setEnabled(false));

    await waitFor(() =>
      expect(usePushNoticeStore.getState().toggleNotice).toBe("error"),
    );
    expect(fcmTokenStorage.get()).toBe("tok-1");
    expect(result.current.checked).toBe(true);
  });
});
