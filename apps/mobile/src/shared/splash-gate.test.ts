import { describe, expect, it, vi } from "vitest";
import { createSplashGate, SPLASH_MAP_TIMEOUT_MS } from "./splash-gate";

/** 주입 스텁 — 예약된 콜백을 직접 발화시켜 타이머 없이 상한 경로를 검증한다 */
const harness = () => {
  const hide = vi.fn();
  const cancel = vi.fn();
  let scheduled: (() => void) | null = null;
  let scheduledMs: number | null = null;
  const schedule = vi.fn((fn: () => void, ms: number) => {
    scheduled = fn;
    scheduledMs = ms;
    return cancel;
  });

  return {
    hide,
    cancel,
    schedule,
    fireTimeout: () => scheduled?.(),
    scheduledMs: () => scheduledMs,
    gate: createSplashGate({ hide, schedule }),
  };
};

describe("splash-gate — 스플래시 해제 게이트 (MSG-445)", () => {
  it("지도 없는 목적지는 즉시 내린다 — 온보딩·업로드 이어가기 경로", () => {
    const { gate, hide, schedule } = harness();

    gate.release();

    expect(hide).toHaveBeenCalledTimes(1);
    expect(schedule).not.toHaveBeenCalled();
  });

  it("지도 홈 목적지는 붙잡고 기다린다 — 대기 중에는 내리지 않는다", () => {
    const { gate, hide, scheduledMs } = harness();

    gate.holdUntilMapReady();

    expect(hide).not.toHaveBeenCalled();
    expect(scheduledMs()).toBe(SPLASH_MAP_TIMEOUT_MS);
  });

  it("지도 준비 완료가 상한보다 빠르면 그 시점에 내리고 타이머를 취소한다", () => {
    const { gate, hide, cancel } = harness();
    gate.holdUntilMapReady();

    gate.release();

    expect(hide).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("지도가 끝내 준비되지 않아도 상한에서 내린다 — 스플래시에 갇히지 않는다", () => {
    const { gate, hide, fireTimeout } = harness();
    gate.holdUntilMapReady();

    fireTimeout();

    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("해제는 멱등이다 — 상한 발화 뒤 지도 준비가 와도 두 번 내리지 않는다", () => {
    const { gate, hide, fireTimeout } = harness();
    gate.holdUntilMapReady();
    fireTimeout();

    gate.release();

    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("이미 내린 뒤의 대기 요청은 무시한다 — 내려간 스플래시가 되살아나지 않는다", () => {
    const { gate, schedule } = harness();
    gate.release();

    gate.holdUntilMapReady();

    expect(schedule).not.toHaveBeenCalled();
  });

  it("대기 요청이 겹쳐도 타이머는 하나다 — 재마운트로 상한이 연장되지 않는다", () => {
    const { gate, schedule } = harness();

    gate.holdUntilMapReady();
    gate.holdUntilMapReady();

    expect(schedule).toHaveBeenCalledTimes(1);
  });
});
