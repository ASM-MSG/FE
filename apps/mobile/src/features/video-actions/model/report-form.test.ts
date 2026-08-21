import { describe, expect, it } from "vitest";
import {
  EMPTY_REPORT_FORM,
  reportFormReducer,
  type ReportFormEvent,
  type ReportFormState,
} from "./report-form";

/**
 * 템플릿 ① 순수 로직 — 신고 폼 로컬 상태 전이 (MSG-431 재작업, L16).
 *
 * 이 파일이 막는 회귀: **제출 성공 후 사유 선택이 남아 다른 영상 신고 모달이 이미
 * 선택된 상태로 열린다**(검증 리포트 §5-①). 오신고 위험이라 전이 자체를 고정한다.
 */
const play = (events: ReportFormEvent[]): ReportFormState =>
  events.reduce(reportFormReducer, EMPTY_REPORT_FORM);

describe("reportFormReducer — 신고 폼 상태 전이 (L16)", () => {
  it("모달이 닫히면 선택 사유와 펼침 상태가 초기 상태로 돌아간다", () => {
    const opened = play([
      { type: "toggleReasonList" },
      { type: "selectReason", reasonId: "spam" },
    ]);
    expect(opened).toEqual({ selected: "spam", expanded: false });

    expect(reportFormReducer(opened, { type: "closed" })).toEqual(
      EMPTY_REPORT_FORM,
    );
  });

  it("제출 성공으로 닫힌 뒤 다시 열면 미선택 상태다 — 다른 영상에 이전 사유가 남지 않는다", () => {
    // 영상 A를 "스팸"으로 신고 → 성공 → 화면이 visible을 내린다(= closed)
    const afterSuccess = play([
      { type: "selectReason", reasonId: "spam" },
      { type: "closed" },
    ]);

    // 영상 B의 ⋯ → 신고하기로 다시 열린 시점 — 아무 이벤트 없이 초기 상태여야 한다
    expect(afterSuccess.selected).toBeNull();
    expect(afterSuccess.expanded).toBe(false);
  });

  it("제출이 실패해 모달이 유지되는 동안에는 선택한 사유가 남는다 — 같은 자리에서 재시도한다", () => {
    // 실패는 모달을 닫지 않으므로 closed 이벤트가 오지 않는다 (reportFailureNotice.shouldClose=false)
    const afterFailure = play([{ type: "selectReason", reasonId: "privacy" }]);

    expect(afterFailure).toEqual({ selected: "privacy", expanded: false });
  });

  it("중복 신고(모달 닫힘 분기)는 성공과 같이 초기 상태로 되돌린다", () => {
    const afterDuplicate = play([
      { type: "selectReason", reasonId: "content" },
      { type: "closed" },
    ]);

    expect(afterDuplicate).toEqual(EMPTY_REPORT_FORM);
  });

  it("사유를 고르면 목록이 접힌다", () => {
    const expandedList = reportFormReducer(EMPTY_REPORT_FORM, {
      type: "toggleReasonList",
    });
    expect(expandedList.expanded).toBe(true);

    expect(
      reportFormReducer(expandedList, {
        type: "selectReason",
        reasonId: "content",
      }),
    ).toEqual({ selected: "content", expanded: false });
  });

  it("목록 펼침 토글은 이미 고른 사유를 건드리지 않는다", () => {
    const selected = reportFormReducer(EMPTY_REPORT_FORM, {
      type: "selectReason",
      reasonId: "privacy",
    });

    expect(reportFormReducer(selected, { type: "toggleReasonList" })).toEqual({
      selected: "privacy",
      expanded: true,
    });
  });

  it("닫힘은 초기 상수와 같은 참조를 돌려준다 — 닫힌 채 반복 관찰돼도 재렌더를 만들지 않는다", () => {
    expect(reportFormReducer(EMPTY_REPORT_FORM, { type: "closed" })).toBe(
      EMPTY_REPORT_FORM,
    );
  });
});
