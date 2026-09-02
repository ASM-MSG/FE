import { describe, expect, it } from "vitest";
import { REJECTED_DETAIL } from "@/test/org-submission-fixture";
import {
  formatSubmissionPeriod,
  submissionTimelineText,
} from "./submission-format";

describe("formatSubmissionPeriod — 목록 행 기간 표기 (AC 2)", () => {
  it("시작·종료일을 'M.D–M.D'로 잇는다", () => {
    expect(formatSubmissionPeriod("2026-09-05", "2026-09-07")).toBe("9.5–9.7");
  });

  it("두 자리 월·일도 앞자리 0을 붙이지 않는다", () => {
    expect(formatSubmissionPeriod("2026-10-02", "2026-10-06")).toBe(
      "10.2–10.6",
    );
  });

  it("날짜만 오는 서버 LocalDate를 KST 달력일 그대로 읽는다 — 하루 밀림 없음", () => {
    expect(formatSubmissionPeriod("2026-01-01", "2026-12-31")).toBe(
      "1.1–12.31",
    );
  });
});

describe("submissionTimelineText — 요약 카드 일자 표기 (AC 4·5, 추정 5)", () => {
  it("상세 history가 있으면 첫 전이를 신청일, 마지막 전이를 처리일로 표기한다", () => {
    expect(
      submissionTimelineText(
        REJECTED_DETAIL.updatedAt,
        REJECTED_DETAIL.history,
      ),
    ).toBe("신청 2026. 8. 18. · 처리 8. 19.");
  });

  it("history가 제출 1건뿐이면 처리일 없이 신청일만 표기한다", () => {
    expect(
      submissionTimelineText("2026-08-18T02:00:00", [
        REJECTED_DETAIL.history[0],
      ]),
    ).toBe("신청 2026. 8. 18.");
  });

  it("상세를 조회하지 않는 비반려 대표는 updatedAt 1개만 표기한다 (추정 5)", () => {
    expect(submissionTimelineText("2026-08-25T03:00:00", null)).toBe(
      "최종 수정 2026. 8. 25.",
    );
  });

  it("타임존 마커 없는 서버 시각을 UTC로 읽어 KST로 옮긴다 — UTC 15:00은 다음 날이다 (경계)", () => {
    expect(
      submissionTimelineText("2026-08-18T15:00:00", [
        { ...REJECTED_DETAIL.history[0], changedAt: "2026-08-18T15:00:00" },
      ]),
    ).toBe("신청 2026. 8. 19.");
  });

  it("history가 빈 배열이면 updatedAt 표기로 내려간다 (경계)", () => {
    expect(submissionTimelineText("2026-08-25T03:00:00", [])).toBe(
      "최종 수정 2026. 8. 25.",
    );
  });
});
