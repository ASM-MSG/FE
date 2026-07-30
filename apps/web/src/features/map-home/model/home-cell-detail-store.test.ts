import { beforeEach, describe, expect, it } from "vitest";
import { useHomeCellDetailStore } from "./home-cell-detail-store";

describe("useHomeCellDetailStore — 홈 셀 상세 선택 (AC 9·9-1·10)", () => {
  beforeEach(() => {
    useHomeCellDetailStore.setState(
      useHomeCellDetailStore.getInitialState(),
      true,
    );
  });

  it("초기 상태는 상세 닫힘(선택 없음)이다 — 기본 패널 표시 (AC 2)", () => {
    expect(useHomeCellDetailStore.getState().selectedCellId).toBeNull();
  });

  it("셀을 선택하면 좌측 패널이 그 셀 상세로 전환된다 (AC 9)", () => {
    useHomeCellDetailStore.getState().select("A-14");

    expect(useHomeCellDetailStore.getState().selectedCellId).toBe("A-14");
  });

  it("상세가 열린 채 다른 셀을 탭하면 상세가 교체된다 (AC 9-1, A3)", () => {
    useHomeCellDetailStore.getState().select("A-14");
    useHomeCellDetailStore.getState().select("B-08");

    expect(useHomeCellDetailStore.getState().selectedCellId).toBe("B-08");
  });

  it("close로 닫으면 기본 패널로 복귀한다 — Escape 키 배선의 대상 (AC 9-1)", () => {
    useHomeCellDetailStore.getState().select("A-14");
    useHomeCellDetailStore.getState().close();

    expect(useHomeCellDetailStore.getState().selectedCellId).toBeNull();
  });
});
