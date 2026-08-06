import { describe, expect, it } from "vitest";
import { REPORT_TYPES } from "./report-types";

describe("신고 유형 목데이터 (MSG-317 AC 14)", () => {
  it("reportType 코드 + 한글 label 쌍 5종 — HARMFUL·SEXUAL·SPAM·PRIVACY·ETC 순서 고정", () => {
    expect(REPORT_TYPES).toEqual([
      { reportType: "HARMFUL", label: "유해·혐오" },
      { reportType: "SEXUAL", label: "음란·선정성" },
      { reportType: "SPAM", label: "스팸·광고" },
      { reportType: "PRIVACY", label: "개인정보 노출" },
      { reportType: "ETC", label: "기타" },
    ]);
  });
});
