import { describe, expect, it } from "vitest";
import {
  canLeaveTypeStep,
  stepIndicatorLabel,
  toStepProgress,
} from "./submission-wizard";

describe("stepIndicatorLabel — 본문 상단 스텝 표시 (AC 9)", () => {
  it("유형 선택 스텝은 '1 / 4 유형 선택'으로 표시된다 (AC 9)", () => {
    expect(stepIndicatorLabel("type")).toBe("1 / 4 유형 선택");
  });

  it("기본 정보 스텝은 '2 / 4 기본 정보'로 표시된다 (AC 9)", () => {
    expect(stepIndicatorLabel("basic")).toBe("2 / 4 기본 정보");
  });

  it("마지막 스텝은 '4 / 4 확인·제출'로 표시된다 (경계)", () => {
    expect(stepIndicatorLabel("review")).toBe("4 / 4 확인·제출");
  });
});

describe("toStepProgress — 등록 절차 진행 표시 파생 (AC 9)", () => {
  it("현재 스텝 이전은 완료, 현재는 강조, 이후는 대기다 (AC 9)", () => {
    expect(toStepProgress("basic")).toEqual([
      { step: "type", order: 1, label: "유형 선택", state: "done" },
      { step: "basic", order: 2, label: "기본 정보", state: "current" },
      { step: "area", order: 3, label: "위치 영역", state: "upcoming" },
      { step: "review", order: 4, label: "확인·제출", state: "upcoming" },
    ]);
  });

  it("첫 스텝에서는 완료 스텝이 없다 (경계 — AC 1)", () => {
    expect(toStepProgress("type").map((item) => item.state)).toEqual([
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
  });
});

describe("canLeaveTypeStep — 유형 스텝 진행 판정 (AC 1·2·5)", () => {
  it("유형이 선택되지 않으면 진행할 수 없다 (AC 1)", () => {
    expect(canLeaveTypeStep({ type: null, parentOccurrenceId: null })).toBe(
      false,
    );
  });

  it("지역축제·팝업스토어는 유형 선택만으로 진행할 수 있다 (AC 2)", () => {
    expect(
      canLeaveTypeStep({ type: "FESTIVAL", parentOccurrenceId: null }),
    ).toBe(true);
    expect(canLeaveTypeStep({ type: "POPUP", parentOccurrenceId: null })).toBe(
      true,
    );
  });

  it("이벤트는 소속 이벤트(parentOccurrenceId)가 확정돼야 진행할 수 있다 (AC 5)", () => {
    expect(canLeaveTypeStep({ type: "EVENT", parentOccurrenceId: null })).toBe(
      false,
    );
    expect(canLeaveTypeStep({ type: "EVENT", parentOccurrenceId: 412 })).toBe(
      true,
    );
  });
});
