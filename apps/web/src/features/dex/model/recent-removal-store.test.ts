import { beforeEach, describe, expect, it } from "vitest";
import { useRecentRemovalStore } from "./recent-removal-store";

describe("useRecentRemovalStore — 최근 목록 X 제거 상태 (AC 23, 개정 D4·A11 비영속)", () => {
  beforeEach(() => {
    useRecentRemovalStore.setState(
      useRecentRemovalStore.getInitialState(),
      true,
    );
  });

  it("초기 상태는 제거 항목 없음이다 — 비영속(메모리)이라 새로고침 시 목록이 복원된다", () => {
    expect(useRecentRemovalStore.getState().removedIds).toEqual([]);
  });

  it("removeRecent(id)는 해당 id만 제거 목록에 추가한다", () => {
    useRecentRemovalStore.getState().removeRecent("A-14");

    expect(useRecentRemovalStore.getState().removedIds).toEqual(["A-14"]);
  });

  it("여러 id를 누적하고, 같은 id 중복 호출은 한 번만 기록한다", () => {
    useRecentRemovalStore.getState().removeRecent("A-14");
    useRecentRemovalStore.getState().removeRecent("B-07");
    useRecentRemovalStore.getState().removeRecent("A-14");

    expect(useRecentRemovalStore.getState().removedIds).toEqual([
      "A-14",
      "B-07",
    ]);
  });
});
