import { beforeEach, describe, expect, it } from "vitest";
import { useMissionSelectionStore } from "./mission-selection-store";
import { useThemeFilterStore } from "./theme-filter-store";

describe("useMissionSelectionStore — 미션 선택·호버 (AC 5·6·16)", () => {
  beforeEach(() => {
    useMissionSelectionStore.setState(
      useMissionSelectionStore.getInitialState(),
      true,
    );
    useThemeFilterStore.setState(useThemeFilterStore.getInitialState(), true);
  });

  it("카드를 고르면 그 미션이 선택된다 (AC 6)", () => {
    useMissionSelectionStore.getState().select(7);

    expect(useMissionSelectionStore.getState().selectedMissionId).toBe(7);
  });

  it("뒤로 가면 선택이 풀려 목록으로 돌아간다 (AC 6)", () => {
    useMissionSelectionStore.getState().select(7);

    useMissionSelectionStore.getState().clear();

    expect(useMissionSelectionStore.getState().selectedMissionId).toBeNull();
  });

  it("카드에 마우스를 올리면 호버 대상이 기록되고 떼면 지워진다 (AC 16)", () => {
    useMissionSelectionStore.getState().hover(3);
    expect(useMissionSelectionStore.getState().hoveredMissionId).toBe(3);

    useMissionSelectionStore.getState().hover(null);

    expect(useMissionSelectionStore.getState().hoveredMissionId).toBeNull();
  });

  it("칩을 바꾸면 미션 선택이 해제된다 (AC 5)", () => {
    useThemeFilterStore.getState().toggle("festival");
    useMissionSelectionStore.getState().select(7);

    useThemeFilterStore.getState().toggle("popup");

    expect(useMissionSelectionStore.getState().selectedMissionId).toBeNull();
  });

  it("홈을 떠났다 오면 선택·호버가 남지 않는다 (AC 5)", () => {
    useMissionSelectionStore.getState().select(7);
    useMissionSelectionStore.getState().hover(7);

    useThemeFilterStore.getState().reset();

    expect(useMissionSelectionStore.getState().selectedMissionId).toBeNull();
    expect(useMissionSelectionStore.getState().hoveredMissionId).toBeNull();
  });
});
