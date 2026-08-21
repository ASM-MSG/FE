import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { fcmTokenStorage } from "@/shared/storage";
import { queryWrapper } from "@/test/query-wrapper";
import { usePushNoticeStore } from "../model/push-notice-store";
import { usePushTokenStore } from "../model/push-token-store";
import type { ForegroundMessage } from "../api/messaging";
import { subscribeForegroundMessages } from "../api/messaging";
import { PushNoticeHost } from "./PushNoticeHost";

/**
 * 포그라운드 푸시 토스트 스모크 (AC 10) — "onMessage 수신 → 제목·본문 토스트 표시 →
 * 닫기" 계약만 고정. firebase는 격리 경계(api/messaging) 모킹 — 스펙 명시.
 * 스택 위치·스타일은 브라우저 검증의 몫.
 */
vi.mock("../api/messaging", () => ({
  readPushCapabilities: vi.fn(() => ({
    hasNotification: true,
    hasServiceWorker: true,
    hasPushManager: true,
  })),
  getPermission: vi.fn(() => "granted"),
  fetchFcmToken: vi.fn(async () => "tok-1"),
  subscribeForegroundMessages: vi.fn(async () => () => {}),
}));

/** 포그라운드 구독 핸들러 캡처 — subscribe 모킹을 emit 함수로 뒤집는다 (두 테스트 공용) */
const captureForegroundEmitter = () => {
  const captured: { emit?: (message: ForegroundMessage) => void } = {};
  vi.mocked(subscribeForegroundMessages).mockImplementation(async (handler) => {
    captured.emit = handler;
    return () => {};
  });
  return captured;
};

beforeEach(() => {
  // 자동 동기화(usePushTokenSync 동거 마운트)는 비로그인로 무발동시킨다 — 이 스모크의
  // 관심사는 포그라운드 수신뿐이다 (동기화 계약은 use-push-token-sync.test가 고정)
  useAuthStore.setState({ accessToken: null, isAuthenticated: false });
  fcmTokenStorage.save("tok-1");
  usePushTokenStore.setState({ token: "tok-1" });
  usePushNoticeStore.setState({ toggleNotice: null });
});

afterEach(() => {
  cleanup();
  fcmTokenStorage.clear();
  vi.resetAllMocks();
});

describe("포그라운드 푸시 토스트 (AC 10)", () => {
  it("onMessage 수신 시 알림 제목·본문 토스트가 표시되고 닫을 수 있다 (AC 10)", async () => {
    const captured = captureForegroundEmitter();
    render(<PushNoticeHost />, { wrapper: queryWrapper });
    await waitFor(() => expect(captured.emit).toBeDefined());

    act(() =>
      captured.emit?.({ title: "새 격자 소식", body: "서면 격자에 새 영상" }),
    );

    expect(await screen.findByText("새 격자 소식")).toBeTruthy();
    expect(screen.getByText("서면 격자에 새 영상")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(screen.queryByText("새 격자 소식")).toBeNull();
  });

  it("수신이 없으면 아무것도 렌더하지 않는다 (AC 10)", async () => {
    render(<PushNoticeHost />, { wrapper: queryWrapper });

    await Promise.resolve();
    expect(screen.queryByRole("status")).toBeNull();
  });
});

/**
 * 토글 안내 단일 스택 (PR #60 리뷰 3) — ProfilePanel 자체 토스트를 제거하고 토글
 * denied/error 안내를 이 호스트가 포그라운드 수신과 한 스택으로 렌더한다는 계약.
 */
describe("토글 안내 단일 스택 (PR #60 리뷰 3)", () => {
  it("토글 안내(denied)가 토스트로 표시되고 닫기가 안내를 지운다", async () => {
    render(<PushNoticeHost />, { wrapper: queryWrapper });

    act(() => usePushNoticeStore.getState().showToggleNotice("denied"));

    expect(await screen.findByText("알림 권한이 차단되어 있어요")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(screen.queryByText("알림 권한이 차단되어 있어요")).toBeNull();
    expect(usePushNoticeStore.getState().toggleNotice).toBeNull();
  });

  it("포그라운드 수신과 토글 안내(error)가 동시에 한 스택에 표시된다 — 겹침 없음", async () => {
    const captured = captureForegroundEmitter();
    render(<PushNoticeHost />, { wrapper: queryWrapper });
    await waitFor(() => expect(captured.emit).toBeDefined());

    act(() => {
      captured.emit?.({ title: "새 격자 소식", body: "서면 격자에 새 영상" });
      usePushNoticeStore.getState().showToggleNotice("error");
    });

    expect(await screen.findByText("새 격자 소식")).toBeTruthy();
    expect(screen.getByText("알림 설정에 실패했어요")).toBeTruthy();
  });
});
