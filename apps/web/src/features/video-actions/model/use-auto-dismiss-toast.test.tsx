import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoDismissToast } from "./use-auto-dismiss-toast";

describe("useAutoDismissToast — 자동 소멸 토스트 (PR #62 리뷰 1)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("메시지를 설정하면 표시되고 durationMs가 지나면 자동 소멸한다", () => {
    const { result } = renderHook(() => useAutoDismissToast(3000));

    act(() => {
      result.current[1]("신고가 접수되었습니다.");
    });
    expect(result.current[0]).toBe("신고가 접수되었습니다.");

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current[0]).toBeNull();
  });

  it("같은 문구를 연속 설정해도 타이머가 재시작된다 — 동일 값 setState 스킵 엣지 (PR #62 리뷰 1)", () => {
    const { result } = renderHook(() => useAutoDismissToast(3000));
    act(() => {
      result.current[1]("실패했어요");
    });

    // 소멸 직전 같은 문구 재설정 — 재시작이 없다면 1000ms 뒤 사라진다
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      result.current[1]("실패했어요");
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current[0]).toBe("실패했어요"); // 재설정 후 2000ms — 아직 표시 중
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current[0]).toBeNull(); // 재설정 기준 3000ms — 소멸
  });

  it("null 설정은 즉시 닫는다", () => {
    const { result } = renderHook(() => useAutoDismissToast(3000));
    act(() => {
      result.current[1]("메시지");
    });

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBeNull();
  });
});
