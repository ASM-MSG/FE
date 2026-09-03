import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HEARTBEAT_INTERVAL_MS, startEventHeartbeat } from "./event-heartbeat";

/**
 * AC 8 (D9, 사용자 결정 Q3): 열람 heartbeat는 **로그인 사용자만** 즉시 1회 + 30초 주기로
 * 보내고, 방을 닫거나 언마운트하면 타이머가 걷힌다. 전송 실패는 삼킨다(다음 주기가 재시도).
 */
describe("startEventHeartbeat — 로그인 열람자 30초 주기 (AC 8·D9)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("로그인 상태면 즉시 1회 보내고 이후 30초마다 보낸다", () => {
    const send = vi.fn(() => Promise.resolve());

    const stop = startEventHeartbeat({
      occurrenceId: 5,
      isAuthenticated: true,
      send,
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(5);
    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2);
    expect(send).toHaveBeenCalledTimes(3);
    stop?.();
  });

  it("비로그인은 한 번도 보내지 않는다 — 익명 X-Viewer-Session 분기는 미포팅이다", () => {
    const send = vi.fn(() => Promise.resolve());

    const stop = startEventHeartbeat({
      occurrenceId: 5,
      isAuthenticated: false,
      send,
    });

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3);
    expect(send).not.toHaveBeenCalled();
    expect(stop).toBeUndefined();
  });

  it("방이 닫혀 있으면(occurrenceId null) 보내지 않는다", () => {
    const send = vi.fn(() => Promise.resolve());

    startEventHeartbeat({ occurrenceId: null, isAuthenticated: true, send });

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
    expect(send).not.toHaveBeenCalled();
  });

  it("정지(언마운트·방 닫힘)하면 이후 주기가 오지 않는다", () => {
    const send = vi.fn(() => Promise.resolve());

    const stop = startEventHeartbeat({
      occurrenceId: 5,
      isAuthenticated: true,
      send,
    });
    stop?.();

    vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("전송 실패를 삼킨다 — 미처리 거부로 번지지 않고 다음 주기가 재시도다", () => {
    const send = vi.fn(() => Promise.reject(new Error("network")));

    const stop = startEventHeartbeat({
      occurrenceId: 5,
      isAuthenticated: true,
      send,
    });

    expect(() => vi.advanceTimersByTime(HEARTBEAT_INTERVAL_MS)).not.toThrow();
    expect(send).toHaveBeenCalledTimes(2);
    stop?.();
  });
});
