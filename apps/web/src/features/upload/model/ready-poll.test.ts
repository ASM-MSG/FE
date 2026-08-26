import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isReadyPollExpired,
  READY_POLL_FIRST_DELAY_MS,
  READY_POLL_MAX_INTERVAL_MS,
  READY_POLL_TIMEOUT_MS,
  readyPollDelayMs,
  resolveReadyTransition,
  startReadyPoll,
} from "./ready-poll";

/**
 * 업로드 반영 폴링 (MSG-476 재작업 2회차) — 확정한 영상이 READY가 되는 순간을 잡아
 * 격자 쿼리를 한 번 더 무효화하기 위한 최소 폴링. 타이머 구동은 fake timers로 검증하고
 * 실제 조회(fetchStatus)는 주입이다.
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
  const onReady = vi.fn();
  const onStop = vi.fn();
  const fetchStatus =
    overrides?.fetchStatus ??
    vi.fn<() => Promise<string>>(async () => "ENCODING");
  const handle = startReadyPoll({
    fetchStatus,
    startedAtMs: overrides?.startedAtMs ?? Date.now(),
    onReady,
    onStop,
  });
  return { handle, fetchStatus, onReady, onStop };
};

describe("전이 판정 — resolveReadyTransition", () => {
  it("READY만 ready, FAILED는 failed, 그 외 처리 상태는 pending이다", () => {
    expect(resolveReadyTransition("READY")).toBe("ready");
    expect(resolveReadyTransition("FAILED")).toBe("failed");
    expect(resolveReadyTransition("UPLOADED")).toBe("pending");
    expect(resolveReadyTransition("ENCODING")).toBe("pending");
  });
});

describe("대기 스케줄 — readyPollDelayMs", () => {
  it("5·5·10·20초로 벌어지다 30초에서 멈춘다 — 인코딩이 대개 끝나는 초반을 촘촘히 덮는다", () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(readyPollDelayMs)).toEqual([
      5_000,
      5_000,
      10_000,
      20_000,
      READY_POLL_MAX_INTERVAL_MS,
      READY_POLL_MAX_INTERVAL_MS,
      READY_POLL_MAX_INTERVAL_MS,
    ]);
  });

  it("첫 조회 지연은 상수와 일치한다", () => {
    expect(readyPollDelayMs(1)).toBe(READY_POLL_FIRST_DELAY_MS);
  });
});

describe("만료 판정 — isReadyPollExpired", () => {
  it("시작 시각으로부터 상한(15분) 경과 시 만료다", () => {
    expect(isReadyPollExpired(0, READY_POLL_TIMEOUT_MS - 1)).toBe(false);
    expect(isReadyPollExpired(0, READY_POLL_TIMEOUT_MS)).toBe(true);
  });
});

describe("폴링 — startReadyPoll", () => {
  it("첫 조회는 간격(30초)이 아니라 짧은 선행 지연(5초) 뒤에 나간다 — 확정 직후 반영을 앞당긴다", async () => {
    const { fetchStatus } = startWith();

    await vi.advanceTimersByTimeAsync(READY_POLL_FIRST_DELAY_MS - 1);
    expect(fetchStatus).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
  });

  it("pending이 이어지면 간격을 벌려가며 조회한다 (5·5·10·20 → 30초 상한)", async () => {
    const { fetchStatus } = startWith();

    await vi.advanceTimersByTimeAsync(readyPollDelayMs(1));
    expect(fetchStatus).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(readyPollDelayMs(2));
    expect(fetchStatus).toHaveBeenCalledTimes(2);

    // 3회차는 10초 — 아직 안 됐다가 정확히 그 시점에 나간다
    await vi.advanceTimersByTimeAsync(readyPollDelayMs(3) - 1);
    expect(fetchStatus).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchStatus).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(readyPollDelayMs(4));
    expect(fetchStatus).toHaveBeenCalledTimes(4);
  });

  it("첫 100초에 6회 조회한다 — 누적 5·10·20·40·70·100초로, 고정 30초(5·35·65·95 = 4회)보다 초반이 촘촘하다", async () => {
    const { fetchStatus } = startWith();

    await vi.advanceTimersByTimeAsync(40_000);
    expect(fetchStatus).toHaveBeenCalledTimes(4);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchStatus).toHaveBeenCalledTimes(6);
  });

  it("READY 전이에서 onReady를 부르고 스스로 멈춘다 — 이후 추가 조회가 없다", async () => {
    const fetchStatus = vi.fn<() => Promise<string>>(async () => "READY");
    const { onReady, onStop } = startWith({ fetchStatus });

    await vi.advanceTimersByTimeAsync(READY_POLL_FIRST_DELAY_MS);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(READY_POLL_MAX_INTERVAL_MS * 3);
    expect(fetchStatus).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("FAILED는 조용히 멈춘다 — onReady 없이 onStop만 부른다 (블러 실패 토스트는 부활하지 않는다)", async () => {
    const fetchStatus = vi.fn<() => Promise<string>>(async () => "FAILED");
    const { onReady, onStop } = startWith({ fetchStatus });

    await vi.advanceTimersByTimeAsync(READY_POLL_FIRST_DELAY_MS);
    expect(onReady).not.toHaveBeenCalled();
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("조회 실패(네트워크 등)는 전이가 아니다 — 다음 간격에 재조회한다", async () => {
    const fetchStatus = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce("READY");
    const { onReady } = startWith({ fetchStatus });

    await vi.advanceTimersByTimeAsync(readyPollDelayMs(1));
    expect(onReady).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(readyPollDelayMs(2));
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("상한(15분)을 넘기면 조회 없이 멈춘다 — 영원히 도는 타이머를 남기지 않는다", async () => {
    const { fetchStatus, onReady, onStop } = startWith({
      startedAtMs: Date.now() - READY_POLL_TIMEOUT_MS,
    });

    await vi.advanceTimersByTimeAsync(READY_POLL_FIRST_DELAY_MS);
    expect(fetchStatus).not.toHaveBeenCalled();
    expect(onReady).not.toHaveBeenCalled();
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("stop() 이후에는 조회도 콜백도 없다", async () => {
    const { handle, fetchStatus, onReady } = startWith();

    handle.stop();
    await vi.advanceTimersByTimeAsync(READY_POLL_MAX_INTERVAL_MS * 5);

    expect(fetchStatus).not.toHaveBeenCalled();
    expect(onReady).not.toHaveBeenCalled();
  });
});
