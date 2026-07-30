import { beforeEach, describe, expect, it } from "vitest";
import { useHomeCellDetailStore } from "./home-cell-detail-store";
import { useThemeFilterStore } from "./theme-filter-store";

describe("useThemeFilterStore — 테마 칩 단일 선택 토글 (AC 4·5)", () => {
  beforeEach(() => {
    useThemeFilterStore.setState(useThemeFilterStore.getInitialState(), true);
    useHomeCellDetailStore.setState(
      useHomeCellDetailStore.getInitialState(),
      true,
    );
  });

  it("기본 상태는 활성 칩 없음이다 (AC 2)", () => {
    expect(useThemeFilterStore.getState().activeTheme).toBeNull();
  });

  it("칩을 탭하면 그 테마가 활성화된다 (AC 3)", () => {
    useThemeFilterStore.getState().toggle("hot");

    expect(useThemeFilterStore.getState().activeTheme).toBe("hot");
  });

  it("활성 칩이 있는 상태에서 다른 칩을 탭하면 기존 칩은 해제되고 새 칩만 활성화된다 (AC 4)", () => {
    useThemeFilterStore.getState().toggle("hot");
    useThemeFilterStore.getState().toggle("festival");

    expect(useThemeFilterStore.getState().activeTheme).toBe("festival");
  });

  it("활성 칩을 다시 탭하면 해제되어 기본 상태로 돌아간다 (AC 5)", () => {
    useThemeFilterStore.getState().toggle("route");
    useThemeFilterStore.getState().toggle("route");

    expect(useThemeFilterStore.getState().activeTheme).toBeNull();
  });
});

describe("useThemeFilterStore — 셀 상세 닫힘 연동 (AC 9-1, A3)", () => {
  beforeEach(() => {
    useThemeFilterStore.setState(useThemeFilterStore.getInitialState(), true);
    useHomeCellDetailStore.setState(
      useHomeCellDetailStore.getInitialState(),
      true,
    );
  });

  it("활성 칩 해제 시 열려 있던 셀 상세가 닫힌다", () => {
    useThemeFilterStore.getState().toggle("hot");
    useHomeCellDetailStore.getState().select("A-14");

    useThemeFilterStore.getState().toggle("hot");

    expect(useHomeCellDetailStore.getState().selectedCellId).toBeNull();
  });

  it("다른 칩으로 전환 시 열려 있던 셀 상세가 닫힌다", () => {
    useThemeFilterStore.getState().toggle("hot");
    useHomeCellDetailStore.getState().select("A-14");

    useThemeFilterStore.getState().toggle("festival");

    expect(useHomeCellDetailStore.getState().selectedCellId).toBeNull();
  });

  it("칩 비활성 중 열린 내 점령 셀 상세(AC 10)도 칩 활성화 시 닫힌다 — 배지·목록 기준이 바뀌므로 유지하지 않는다", () => {
    useHomeCellDetailStore.getState().select("A-14");

    useThemeFilterStore.getState().toggle("popup");

    expect(useHomeCellDetailStore.getState().selectedCellId).toBeNull();
  });
});
