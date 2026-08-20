import { describe, expect, it } from "vitest";
import {
  closeTheme,
  sheetStageFor,
  showsCloseButton,
  stepBack,
  type HomeSelection,
} from "./sheet-navigation";

/**
 * A3·A4·A5·A6: 상세 헤더 `‹`·Android 하드웨어 뒤로가기가 한 단계 위로 가고, 헤더 `✕`는
 * 핫구역 요약·상세 4종에만 있으며 누르면 최초 홈 상태로 복귀한다. 목록 시트는 2단계,
 * 상세 시트는 1단계로 스냅한다 (MSG-427).
 */
const base: HomeSelection = {
  activeTheme: null,
  selectedMissionId: null,
  selectedGridId: null,
};

describe("시트 단계 복귀 (A3·A5)", () => {
  it("격자 상세 → 미션/코스 상세 (코스 스팟에서 내려온 경우)", () => {
    expect(
      stepBack({
        activeTheme: "route",
        selectedMissionId: 12,
        selectedGridId: "16858_11420",
      }),
    ).toEqual({
      activeTheme: "route",
      selectedMissionId: 12,
      selectedGridId: null,
    });
  });

  it("격자 상세 → 칩 요약 (핫구역에서 격자를 탭한 경우)", () => {
    expect(
      stepBack({
        activeTheme: "hot",
        selectedMissionId: null,
        selectedGridId: "16858_11420",
      }),
    ).toEqual({
      activeTheme: "hot",
      selectedMissionId: null,
      selectedGridId: null,
    });
  });

  it("미션·코스 상세 → 칩 목록", () => {
    expect(
      stepBack({
        activeTheme: "festival",
        selectedMissionId: 11,
        selectedGridId: null,
      }),
    ).toEqual({
      activeTheme: "festival",
      selectedMissionId: null,
      selectedGridId: null,
    });
  });

  it("칩 목록 → 기본 시트(테마 해제)", () => {
    expect({ ...stepBack({ ...base, activeTheme: "popup" }) }).toEqual(base);
  });

  it("최상위(기본 시트)에서는 null — 화면을 벗어난다 (A5)", () => {
    expect(stepBack(base)).toBeNull();
  });
});

describe("헤더 ✕ (A2·A4)", () => {
  it("테마·선택 미션·선택 격자를 함께 초기화해 최초 홈 상태로 복귀한다", () => {
    expect(
      closeTheme({
        activeTheme: "route",
        selectedMissionId: 12,
        selectedGridId: "16858_11420",
      }),
    ).toEqual(base);
  });

  it("핫구역 요약·상세 4종에만 있고 목록 시트에는 없다", () => {
    expect(showsCloseButton("hot-region")).toBe(true);
    expect(showsCloseButton("grid-detail")).toBe(true);
    expect(showsCloseButton("mission-detail")).toBe(true);
    expect(showsCloseButton("course-detail")).toBe(true);
    expect(showsCloseButton("mission-list")).toBe(false);
    expect(showsCloseButton("course-list")).toBe(false);
    expect(showsCloseButton("region")).toBe(false);
  });
});

describe("시트 스냅 단계 (A6)", () => {
  it("목록 시트는 2단계(절반), 상세 시트는 1단계(전체 확장)로 연다", () => {
    expect(sheetStageFor("mission-list")).toBe(2);
    expect(sheetStageFor("course-list")).toBe(2);
    expect(sheetStageFor("hot-region")).toBe(2);
    expect(sheetStageFor("region")).toBe(2);
    expect(sheetStageFor("mission-detail")).toBe(1);
    expect(sheetStageFor("course-detail")).toBe(1);
    expect(sheetStageFor("grid-detail")).toBe(1);
  });
});
