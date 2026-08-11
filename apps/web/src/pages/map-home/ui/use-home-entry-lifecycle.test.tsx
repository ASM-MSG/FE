import { StrictMode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import { useHomeEntryLifecycle } from "./use-home-entry-lifecycle";

/**
 * 홈 진입/이탈 수명주기 회귀 (리뷰 반영 — 커버리지 공백 해소).
 * StrictMode 이중 마운트(마운트→클린업→재마운트)에서 AC 14 초기화 클린업이 셸 선점
 * 선택을 지우는 상호작용을 실제 <StrictMode> 렌더로 재현한다 — resetThemeFilter나
 * select의 동작이 바뀌어 보존이 깨지면 여기서 잡힌다.
 */
const Host = () => {
  useHomeEntryLifecycle();
  return null;
};

const GRID = "16846_11428";

beforeEach(() => {
  useHomeCellDetailStore.setState({ selectedCellId: null });
  useThemeFilterStore.setState({ activeTheme: null });
});

afterEach(() => {
  cleanup();
});

describe("useHomeEntryLifecycle", () => {
  it("셸 선점 진입: 마운트 직전 선택이 StrictMode 이중 마운트 초기화를 살아남는다", () => {
    useHomeCellDetailStore.getState().select(GRID); // 셸이 select 후 홈 전환

    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );

    expect(useHomeCellDetailStore.getState().selectedCellId).toBe(GRID);
  });

  it("일반 진입(선점 없음): 선택은 비어 있고 초기화가 무동작이다", () => {
    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );

    expect(useHomeCellDetailStore.getState().selectedCellId).toBeNull();
  });

  it("홈 이탈(언마운트): 칩·셀 상세가 기본 상태로 초기화된다 (AC 14)", () => {
    const { unmount } = render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    useHomeCellDetailStore.getState().select(GRID);
    useThemeFilterStore.setState({ activeTheme: "hot" });

    unmount();

    expect(useHomeCellDetailStore.getState().selectedCellId).toBeNull();
    expect(useThemeFilterStore.getState().activeTheme).toBeNull();
  });
});
