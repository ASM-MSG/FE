import { describe, expect, it } from "vitest";
import {
  MY_SUBMISSIONS,
  submissionSummary,
} from "@/test/org-submission-fixture";
import {
  filterSubmissions,
  isOrgSubmissionStatus,
  submissionCountsSummary,
  submissionStatusLabel,
  submissionStatusTone,
  submissionTypeLabel,
  totalSubmissionCount,
} from "./submission-status";

describe("totalSubmissionCount — 전체 신청 = counts 3필드 합산 (AC 1)", () => {
  it("심사 중·승인됨·반려됨을 더한 값이 전체 신청 수다", () => {
    expect(
      totalSubmissionCount({ inReview: 1, approved: 1, rejected: 1 }),
    ).toBe(3);
  });

  it("전부 0이면 0이다 (빈 상태 경계 — AC 8)", () => {
    expect(
      totalSubmissionCount({ inReview: 0, approved: 0, rejected: 0 }),
    ).toBe(0);
  });
});

describe("submissionStatusLabel·submissionStatusTone — 상태 라벨·칩 톤 매핑 (AC 2)", () => {
  it("IN_REVIEW은 '심사 중'·warning 톤이다", () => {
    expect(submissionStatusLabel("IN_REVIEW")).toBe("심사 중");
    expect(submissionStatusTone("IN_REVIEW")).toBe("warning");
  });

  it("APPROVED는 '승인됨'·success 톤이다", () => {
    expect(submissionStatusLabel("APPROVED")).toBe("승인됨");
    expect(submissionStatusTone("APPROVED")).toBe("success");
  });

  it("REJECTED는 '반려됨'·error 톤이다", () => {
    expect(submissionStatusLabel("REJECTED")).toBe("반려됨");
    expect(submissionStatusTone("REJECTED")).toBe("error");
  });

  it("미지 status 값은 라벨을 원문으로 두고 톤이 없다 — 행을 깨뜨리지 않는다 (AC 2, 추정 6)", () => {
    expect(submissionStatusLabel("ON_HOLD")).toBe("ON_HOLD");
    expect(submissionStatusTone("ON_HOLD")).toBeNull();
  });
});

describe("isOrgSubmissionStatus — 미지 값 안전 가드 (AC 2)", () => {
  it("서버 확정 3값만 통과한다", () => {
    expect(isOrgSubmissionStatus("IN_REVIEW")).toBe(true);
    expect(isOrgSubmissionStatus("APPROVED")).toBe(true);
    expect(isOrgSubmissionStatus("REJECTED")).toBe(true);
  });

  it("확정 밖의 문자열은 거부한다", () => {
    expect(isOrgSubmissionStatus("ON_HOLD")).toBe(false);
    expect(isOrgSubmissionStatus("")).toBe(false);
  });
});

describe("filterSubmissions — 상태 필터 칩의 클라이언트 필터 (AC 3)", () => {
  it("'전체'는 서버 순서 그대로의 원본을 돌려준다", () => {
    expect(filterSubmissions(MY_SUBMISSIONS, "ALL").map((s) => s.id)).toEqual([
      11, 12, 13,
    ]);
  });

  it("'심사 중'은 IN_REVIEW 행만 남긴다", () => {
    expect(
      filterSubmissions(MY_SUBMISSIONS, "IN_REVIEW").map((s) => s.id),
    ).toEqual([11]);
  });

  it("'승인됨'은 APPROVED 행만 남긴다", () => {
    expect(
      filterSubmissions(MY_SUBMISSIONS, "APPROVED").map((s) => s.id),
    ).toEqual([13]);
  });

  it("'반려됨'은 REJECTED 행만 남긴다", () => {
    expect(
      filterSubmissions(MY_SUBMISSIONS, "REJECTED").map((s) => s.id),
    ).toEqual([12]);
  });

  it("미지 status 행은 '전체'에만 잡힌다 (추정 6)", () => {
    const list = [
      ...MY_SUBMISSIONS,
      submissionSummary({ id: 14, status: "ON_HOLD" }),
    ];

    expect(filterSubmissions(list, "ALL").map((s) => s.id)).toEqual([
      11, 12, 13, 14,
    ]);
    expect(filterSubmissions(list, "IN_REVIEW").map((s) => s.id)).toEqual([11]);
  });

  it("해당 상태가 없으면 빈 배열이다 — 필터 결과 0건 문구의 조건 (추정 7)", () => {
    expect(filterSubmissions([submissionSummary()], "REJECTED")).toEqual([]);
  });
});

describe("submissionCountsSummary — 목록 부제의 counts 요약 (MSG-549 AC 1)", () => {
  it("전체 건수와 상태별 건수를 한 줄로 요약한다 (AC 1)", () => {
    expect(
      submissionCountsSummary({ inReview: 1, approved: 1, rejected: 1 }),
    ).toBe("신청 3건 (심사 중 1 · 승인 1 · 반려 1)");
  });

  it("전부 0이면 0건 요약이다 (빈 상태 경계 — AC 4)", () => {
    expect(
      submissionCountsSummary({ inReview: 0, approved: 0, rejected: 0 }),
    ).toBe("신청 0건 (심사 중 0 · 승인 0 · 반려 0)");
  });
});

describe("submissionTypeLabel — 목록 행 유형 라벨 (MSG-549 AC 1)", () => {
  it("등록 유형 3종을 위저드와 같은 표시명으로 옮긴다 (AC 1)", () => {
    expect(submissionTypeLabel("FESTIVAL")).toBe("지역축제");
    expect(submissionTypeLabel("POPUP")).toBe("팝업스토어");
    expect(submissionTypeLabel("EVENT")).toBe("이벤트");
  });

  it("미지 유형은 원문을 그대로 싣는다 (AC 1 경계)", () => {
    expect(submissionTypeLabel("MARKET")).toBe("MARKET");
  });
});
