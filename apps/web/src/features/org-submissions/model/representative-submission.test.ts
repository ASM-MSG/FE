import { describe, expect, it } from "vitest";
import {
  MY_SUBMISSIONS,
  submissionSummary,
} from "@/test/org-submission-fixture";
import { pickRepresentative } from "./representative-submission";

describe("pickRepresentative — 요약 카드 대표 신청 선정 (AC 4, 추정 3)", () => {
  it("반려가 있으면 목록 순서상 첫 REJECTED가 대표다", () => {
    expect(pickRepresentative(MY_SUBMISSIONS)?.id).toBe(12);
  });

  it("반려가 둘이면 더 앞선(최신 제출) 반려가 대표다", () => {
    const list = [
      submissionSummary({ id: 21, status: "REJECTED" }),
      submissionSummary({ id: 22, status: "REJECTED" }),
    ];

    expect(pickRepresentative(list)?.id).toBe(21);
  });

  it("반려가 없으면 첫 행(최신 제출)이 대표다", () => {
    const list = [
      submissionSummary({ id: 31, status: "APPROVED" }),
      submissionSummary({ id: 32, status: "IN_REVIEW" }),
    ];

    expect(pickRepresentative(list)?.id).toBe(31);
  });

  it("빈 목록이면 대표가 없다 (경계 — 빈 상태 조건, AC 8)", () => {
    expect(pickRepresentative([])).toBeNull();
  });
});
