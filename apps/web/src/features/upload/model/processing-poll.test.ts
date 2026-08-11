import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isPollExpired,
  PROCESSING_POLL_INTERVAL_MS,
  PROCESSING_POLL_TIMEOUT_MS,
  resolveProcessingTransition,
  startProcessingPoll,
} from "./processing-poll";

/**
 * 블러 처리 폴링 — 30초 간격 / 15분 상한 / READY·FAILED 전이 판정 (B14).
 * 타이머 구동은 fake timers로 검증한다. getPlayback 호출 자체는 주입(fetchStatus)이다.
 */

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const startWith = (overrides?: {
  fetchStatus?: ReturnType<typeof vi.fn<() => Promise<string>>>;
  startedAtMs?: number;
}) => {
  const callbacks = {
    onReady: vi.fn(),
    onFailed: vi.fn(),
    onTimeout: vi.fn(),
  };
  const fetchStatus =
    overrides?.fetchStatus ??
    vi.fn<() => Promise<string>>(async () => "BLURRING");
  const handle = startProcessingPoll({
    fetchStatus,
    startedAtMs: overrides?.startedAtMs ?? Date.now(),
    ...callbacks,
  });
  return { handle, fetchStatus, ...callbacks };
};

describe("전이 판정 — resolveProcessingTransition (B14)", () => {
  it("READY는 ready, FAILED는 failed, 그 외(UPLOADED·ENCODING·BLURRING)는 pending이다", () => {
    expect(resolveProcessingTransition("READY")).toBe("ready");
    expect(resolveProcessingTransition("FAILED")).toBe("failed");
    expect(resolveProcessingTransition("UPLOADED")).toBe("pending");
    expect(resolveProcessingTransition("ENCODING")).toBe("pending");
    expect(resolveProcessingTransition("BLURRING")).toBe("pending");
  });
});

describe("폴링 간격 — 30초 (B14)", () => {
  it("간격 상수는 30초·상한 상수는 15분이다", () => {
    expect(PROCESSING_POLL_INTERVAL_MS).toBe(30_000);
    expect(PROCESSING_POLL_TIMEOUT_MS).toBe(15 * 60_000);
  });

  it("30초가 지나야 첫 조회를 하고, pending이면 30초 뒤 다시 조회한다", async () => {
    const { fetchStatus } = startWith();

    await vi.advanceTimersByTimeAsync(29_999);
    expect(fetchStatus).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchStatus).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchStatus).toHaveBeenCalledTimes(2);
  });
});

describe("READY / FAILED 전이 감지 (B14)", () => {
  it("READY 전이 시 onReady를 호출하고 폴링을 멈춘다", async () => {
    const fetchStatus = vi
      .fn(async () => "READY")
      .mockResolvedValueOnce("BLURRING");
    const { onReady, onFailed } = startWith({ fetchStatus });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onFailed).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchStatus).toHaveBeenCalledTimes(2); // 전이 후 추가 조회 없음
  });

  it("FAILED 전이 시 onFailed를 호출하고 폴링을 멈춘다", async () => {
    const fetchStatus = vi.fn(async () => "FAILED");
    const { onFailed, onReady } = startWith({ fetchStatus });

    await vi.advanceTimersByTimeAsync(30_000);
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onReady).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
  });
});

describe("15분 상한 (B14)", () => {
  it("15분 무전이 시 폴링을 멈추고 onTimeout을 호출한다 — '처리가 늦어지고 있어요' 전환", async () => {
    const { fetchStatus, onTimeout } = startWith();

    await vi.advanceTimersByTimeAsync(15 * 60_000 + 30_000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    // 상한 도달 후 추가 조회 없음 (상한 전까지 30초 간격 조회 = 29회)
    const callsAtTimeout = fetchStatus.mock.calls.length;
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchStatus).toHaveBeenCalledTimes(callsAtTimeout);
  });

  it("재방문 등으로 시작 시각이 이미 상한을 넘겼으면 조회 없이 즉시 만료 처리한다", async () => {
    const { fetchStatus, onTimeout } = startWith({
      startedAtMs: Date.now() - (15 * 60_000 + 1),
    });

    await vi.advanceTimersByTimeAsync(30_000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(fetchStatus).not.toHaveBeenCalled();
  });

  it("isPollExpired — 15분 경과 시점부터 만료다", () => {
    expect(isPollExpired(0, PROCESSING_POLL_TIMEOUT_MS - 1)).toBe(false);
    expect(isPollExpired(0, PROCESSING_POLL_TIMEOUT_MS)).toBe(true);
  });
});

describe("checkNow — 재진입·탭 포커스 복귀 즉시 조회 (B15 연동)", () => {
  it("checkNow는 간격을 기다리지 않고 즉시 조회한다", async () => {
    const { handle, fetchStatus } = startWith();

    await handle.checkNow();
    expect(fetchStatus).toHaveBeenCalledTimes(1);
  });

  it("checkNow에서 READY를 감지하면 onReady 후 폴링을 멈춘다", async () => {
    const fetchStatus = vi.fn(async () => "READY");
    const { handle, onReady } = startWith({ fetchStatus });

    await handle.checkNow();
    expect(onReady).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
  });
});

describe("stop — 폴링 중지", () => {
  it("stop 이후에는 조회하지 않는다", async () => {
    const { handle, fetchStatus } = startWith();

    handle.stop();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchStatus).not.toHaveBeenCalled();
  });

  it("조회 실패(네트워크 오류)는 전이가 아니다 — 다음 간격에 계속 조회한다", async () => {
    const fetchStatus = vi
      .fn(async () => "BLURRING")
      .mockRejectedValueOnce(new Error("네트워크 오류"));
    const { onFailed } = startWith({ fetchStatus });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchStatus).toHaveBeenCalledTimes(2);
    expect(onFailed).not.toHaveBeenCalled();
  });
});
