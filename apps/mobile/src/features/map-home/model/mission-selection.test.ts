import { beforeEach, describe, expect, it } from "vitest";
import {
  getSelectedGridId,
  setSelectedGridId,
  subscribeSelectedGridId,
} from "./grid-selection";
import {
  getSelectedMissionId,
  setSelectedMissionId,
  subscribeSelectedMissionId,
} from "./mission-selection";

/**
 * A2: 칩을 다시 누르면 테마가 해제되고 시트가 기본 콘텐츠로 돌아간다 — 선택 미션·선택
 * 격자도 함께 초기화된다 (MSG-427). 두 선택 상태는 `theme-selection.ts`와 같은 모듈
 * 싱글턴 관례다(zustand 미도입) — 홈 스크린이 탭 왕복마다 재마운트되기 때문.
 */
beforeEach(() => {
  setSelectedMissionId(null);
  setSelectedGridId(null);
});

describe("선택 미션 모듈 상태", () => {
  it("설정한 값을 읽고 null로 되돌린다", () => {
    setSelectedMissionId(11);
    expect(getSelectedMissionId()).toBe(11);

    setSelectedMissionId(null);
    expect(getSelectedMissionId()).toBeNull();
  });

  it("구독자에게 변경을 알리고 해제하면 더 알리지 않는다", () => {
    let calls = 0;
    const unsubscribe = subscribeSelectedMissionId(() => {
      calls += 1;
    });

    setSelectedMissionId(11);
    expect(calls).toBe(1);

    unsubscribe();
    setSelectedMissionId(12);
    expect(calls).toBe(1);
  });
});

describe("선택 격자 모듈 상태", () => {
  it("설정한 값을 읽고 null로 되돌린다", () => {
    setSelectedGridId("16858_11420");
    expect(getSelectedGridId()).toBe("16858_11420");

    setSelectedGridId(null);
    expect(getSelectedGridId()).toBeNull();
  });

  it("구독자에게 변경을 알린다", () => {
    let calls = 0;
    const unsubscribe = subscribeSelectedGridId(() => {
      calls += 1;
    });

    setSelectedGridId("16858_11420");
    expect(calls).toBe(1);
    unsubscribe();
  });
});
