import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./use-debounced-value";

describe("useDebouncedValue — 입력 디바운스 (AC 15·추정 9)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("마운트 시점 값은 지연 없이 그대로 노출된다 (경계 — 초기 조회 지연 방지)", () => {
    const { result } = renderHook(() => useDebouncedValue("서면", 300));

    expect(result.current.debounced).toBe("서면");
  });

  it("값이 바뀌면 지연 시간이 지난 뒤에만 반영된다 (AC 15)", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "" } },
    );

    rerender({ value: "서면" });
    act(() => vi.advanceTimersByTime(299));

    expect(result.current.debounced).toBe("");

    act(() => vi.advanceTimersByTime(1));

    expect(result.current.debounced).toBe("서면");
  });

  it("지연 내 연속 변경은 마지막 값만 반영된다 (AC 15 — 타이핑마다 호출 방지)", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "" } },
    );

    rerender({ value: "서" });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: "서면" });
    act(() => vi.advanceTimersByTime(300));

    expect(result.current.debounced).toBe("서면");
  });

  it("flush는 지연을 기다리지 않고 즉시 반영한다 (추정 4 — Enter·인기 검색어 즉시 검색)", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "" } },
    );

    rerender({ value: "서면" });
    act(() => result.current.flush("서면"));

    expect(result.current.debounced).toBe("서면");
  });
});
