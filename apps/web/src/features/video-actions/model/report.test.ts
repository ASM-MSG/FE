import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/api-error";
import {
  canSubmitReport,
  REPORT_REASONS,
  reportFailureNotice,
  toServerReportReason,
} from "./report";

/*
 * REPORT_REASONS·canSubmitReport 단정은 widgets/cell-detail/model/report.test.ts에서
 * 이동한 보존 단정(MSG-116 L1~L3)이다 — MSG-411은 목업(submitReport)만 제거하고
 * 사유 3종·제출 판정 계약은 유지한다.
 */

describe("REPORT_REASONS", () => {
  it("정확히 3개의 사유 옵션을 가진다", () => {
    expect(REPORT_REASONS).toHaveLength(3);
  });

  it("각 옵션의 라벨이 기획에 확정된 문구와 일치한다", () => {
    expect(REPORT_REASONS.map((r) => r.label)).toEqual([
      "부적절한 콘텐츠(선정성·폭력성 등)",
      "사생활 침해(얼굴·번호판 등 노출)",
      "스팸 또는 도배성 콘텐츠",
    ]);
  });

  it("각 옵션의 id는 content / privacy / spam 이다", () => {
    expect(REPORT_REASONS.map((r) => r.id)).toEqual([
      "content",
      "privacy",
      "spam",
    ]);
  });
});

describe("canSubmitReport", () => {
  it("사유가 선택되지 않았으면(null) false를 반환한다", () => {
    expect(canSubmitReport(null)).toBe(false);
  });

  it("유효한 사유 id가 선택되면 true를 반환한다", () => {
    for (const reason of REPORT_REASONS) {
      expect(canSubmitReport(reason.id)).toBe(true);
    }
  });

  it("유효하지 않은(목록에 없는) 사유 id면 false를 반환한다", () => {
    expect(canSubmitReport("unknown")).toBe(false);
    expect(canSubmitReport("")).toBe(false);
  });
});

describe("toServerReportReason — FE 사유 id → 서버 enum 매핑 (AC 6)", () => {
  it("content→INAPPROPRIATE, privacy→PRIVACY, spam→SPAM으로 매핑한다 (AC 6)", () => {
    expect(toServerReportReason("content")).toBe("INAPPROPRIATE");
    expect(toServerReportReason("privacy")).toBe("PRIVACY");
    expect(toServerReportReason("spam")).toBe("SPAM");
  });
});

describe("reportFailureNotice — 신고 실패 분기 (AC 8)", () => {
  it("developCode 11409면 '이미 신고한 영상' 안내 + 모달 닫기로 분기한다 (AC 8)", () => {
    const notice = reportFailureNotice(
      new ApiError("이미 신고한 영상입니다.", {
        status: 409,
        developCode: 11409,
      }),
    );

    expect(notice.shouldClose).toBe(true);
    expect(notice.message).toContain("이미 신고한 영상");
  });

  it("developCode 없이 HTTP 409만 와도 같은 분기다 — 이중 표기 방어 (AC 8, 리스크)", () => {
    const notice = reportFailureNotice(
      new ApiError("Conflict", { status: 409 }),
    );

    expect(notice.shouldClose).toBe(true);
    expect(notice.message).toContain("이미 신고한 영상");
  });

  it("그 외 에러는 일반 실패 문구 + 모달 유지로 분기한다 — 중복 문구로 새지 않는다 (AC 8)", () => {
    const notice = reportFailureNotice(
      new ApiError("서버 오류", { status: 500 }),
    );

    expect(notice.shouldClose).toBe(false);
    expect(notice.message).not.toContain("이미 신고한 영상");
  });
});
