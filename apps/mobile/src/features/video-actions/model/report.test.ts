import { describe, expect, it } from "vitest";
import { ApiError } from "../../../shared/api/api-error";
import {
  canSubmitReport,
  DUPLICATE_REPORT_DEVELOP_CODE,
  REPORT_REASONS,
  reportFailureNotice,
  toServerReportReason,
} from "./report";

/**
 * 템플릿 ① 순수 로직 — 영상 신고 사유 카탈로그·제출 판정·실패 분기 (MSG-431 L9~L11).
 * 웹 `features/video-actions/model/report.ts` 포팅분이며 동등성은 `report.parity.test.ts`가 고정한다.
 */

describe("REPORT_REASONS — 신고 사유 카탈로그 (L9)", () => {
  it("웹 정본과 같은 3종(부적절한 콘텐츠·사생활 침해·스팸)만 노출한다 (L9)", () => {
    expect(REPORT_REASONS.map((reason) => reason.id)).toEqual([
      "content",
      "privacy",
      "spam",
    ]);
  });

  it("서버 enum 매핑이 INAPPROPRIATE·PRIVACY·SPAM이다 (L9)", () => {
    expect(toServerReportReason("content")).toBe("INAPPROPRIATE");
    expect(toServerReportReason("privacy")).toBe("PRIVACY");
    expect(toServerReportReason("spam")).toBe("SPAM");
  });
});

describe("canSubmitReport — 제출 가능 판정 (L10)", () => {
  it("사유를 고르지 않았으면 제출할 수 없다 (L10)", () => {
    expect(canSubmitReport(null)).toBe(false);
  });

  it("목록에 없는 사유 id도 제출할 수 없다 (L10)", () => {
    expect(canSubmitReport("HARMFUL")).toBe(false);
  });

  it("목록의 사유를 고르면 제출할 수 있다 (L10)", () => {
    expect(canSubmitReport("spam")).toBe(true);
  });
});

describe("reportFailureNotice — 신고 실패 분기 (L11)", () => {
  it("중복 신고(developCode 11409)는 이미 신고한 영상 안내 + 모달 닫기다 (L11)", () => {
    const error = new ApiError("이미 신고함", {
      status: 400,
      developCode: DUPLICATE_REPORT_DEVELOP_CODE,
    });

    expect(reportFailureNotice(error)).toEqual({
      message: "이미 신고한 영상이에요. 검토 후 조치돼요.",
      shouldClose: true,
    });
  });

  it("HTTP 409만 와도 중복 신고로 판정한다 — 이중 표기 방어 (L11)", () => {
    const error = new ApiError("conflict", { status: 409 });

    expect(reportFailureNotice(error).shouldClose).toBe(true);
  });

  it("그 밖의 실패는 일반 안내 + 모달 유지로 재시도할 수 있다 (L11)", () => {
    const error = new ApiError("서버 오류", { status: 500 });

    expect(reportFailureNotice(error)).toEqual({
      message: "신고를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.",
      shouldClose: false,
    });
  });

  it("ApiError가 아닌 예외도 일반 안내로 수렴한다 (L11 — 경계)", () => {
    expect(reportFailureNotice(new Error("boom")).shouldClose).toBe(false);
  });
});
