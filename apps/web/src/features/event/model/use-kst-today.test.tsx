import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { msUntilNextKstMidnight, useKstToday } from "./use-kst-today";

describe("msUntilNextKstMidnight — 다음 KST 자정까지 남은 ms (순수)", () => {
  it("KST 낮 시각이면 그날 자정까지 남은 시간을 준다", () => {
    // 2026-09-07T03:00:00Z = KST 9/7 12:00 → 자정까지 12시간
    expect(msUntilNextKstMidnight(Date.parse("2026-09-07T03:00:00Z"))).toBe(
      12 * 3_600_000,
    );
  });

  it("KST 자정 정각이면 다음 자정까지 만 하루를 준다 (0 반환 금지 — 타이머 무한 루프 방지)", () => {
    // 2026-09-06T15:00:00Z = KST 9/7 00:00
    expect(msUntilNextKstMidnight(Date.parse("2026-09-06T15:00:00Z"))).toBe(
      86_400_000,
    );
  });
});

describe("useKstToday — KST 자정에 오늘 날짜를 갱신한다 (codex 리뷰 P2)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("자정을 넘기면 재렌더 없이도 다음 날짜로 바뀐다", () => {
    // KST 2026-09-07 23:59:00 (= UTC 14:59)
    vi.setSystemTime(new Date("2026-09-07T14:59:00Z"));
    const { result } = renderHook(() => useKstToday());
    expect(result.current).toBe("2026-09-07");

    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(result.current).toBe("2026-09-08");
  });

  it("연속으로 이틀을 넘겨도 계속 따라간다 (재예약 체인)", () => {
    vi.setSystemTime(new Date("2026-09-07T14:59:00Z"));
    const { result } = renderHook(() => useKstToday());

    act(() => {
      vi.advanceTimersByTime(61_000 + 86_400_000);
    });
    expect(result.current).toBe("2026-09-09");
  });

  it("언마운트하면 타이머를 걷는다", () => {
    vi.setSystemTime(new Date("2026-09-07T14:59:00Z"));
    const { unmount } = renderHook(() => useKstToday());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
