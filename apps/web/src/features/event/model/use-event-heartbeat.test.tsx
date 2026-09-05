import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import {
  HEARTBEAT_INTERVAL_MS,
  useEventHeartbeat,
} from "./use-event-heartbeat";

describe("useEventHeartbeat — 행사방 열람 신호 30초 주기 전송 (AC 5)", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    signOutForTest();
    fetchSpy = vi.fn(async () => envelopeResponse(null));
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  const sentRequests = (): Request[] =>
    fetchSpy.mock.calls.map((call) => call[0] as Request);

  it("행사방이 열리면 즉시 1회 + 30초 주기로 heartbeat를 보낸다 (AC 5 — 확정 2)", async () => {
    renderHook(() => useEventHeartbeat(7));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("비로그인 전송에는 X-Viewer-Session 헤더(64자 이하 고정 세션 id)가 실린다 (AC 5 — 확정 3)", async () => {
    renderHook(() => useEventHeartbeat(7));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS + 50);
    });

    const [first, second] = sentRequests();
    const sessionId = first?.headers.get("X-Viewer-Session");
    expect(sessionId).toBeTruthy();
    expect(sessionId!.trim().length).toBeGreaterThan(0);
    expect(sessionId!.length).toBeLessThanOrEqual(64);
    // 같은 탭의 연속 전송은 같은 세션으로 집계돼야 한다 — id 고정
    expect(second?.headers.get("X-Viewer-Session")).toBe(sessionId);
  });

  it("로그인 상태 전송에는 X-Viewer-Session 헤더를 싣지 않는다 (AC 5 — 비로그인 한정)", async () => {
    signInForTest();

    renderHook(() => useEventHeartbeat(7));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    const [first] = sentRequests();
    expect(first?.headers.get("X-Viewer-Session")).toBeNull();
  });

  it("행사방을 닫으면(언마운트) 전송이 중단된다 (AC 5)", async () => {
    const { unmount } = renderHook(() => useEventHeartbeat(7));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 2);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("행사방이 닫혀 있으면(null) 전송하지 않는다 (AC 5)", async () => {
    renderHook(() => useEventHeartbeat(null));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS + 50);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
