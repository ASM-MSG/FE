import { describe, expect, it } from "vitest";
import { rejectionReasonLabels } from "./rejection-reason";

describe("rejectionReasonLabels — 반려 항목 코드 라벨 (MSG-549 AC 7)", () => {
  it("계약 코드 4종을 화면 라벨로 옮겨 ' · '로 잇는다 (AC 7)", () => {
    expect(rejectionReasonLabels(["PERIOD", "AREA", "IMAGE", "INFO"])).toBe(
      "행사 기간 · 위치 영역 · 홍보 이미지 · 행사 정보",
    );
  });

  it("코드 순서는 서버가 보낸 순서를 유지한다 (AC 7)", () => {
    expect(rejectionReasonLabels(["IMAGE", "PERIOD"])).toBe(
      "홍보 이미지 · 행사 기간",
    );
  });

  it("미지 코드는 원문을 그대로 싣는다 — 항목 줄이 비지 않는다 (AC 7 경계)", () => {
    expect(rejectionReasonLabels(["PERIOD", "AREA_UNRELATED"])).toBe(
      "행사 기간 · AREA_UNRELATED",
    );
  });

  it("코드가 없으면 빈 문자열이다 (경계)", () => {
    expect(rejectionReasonLabels([])).toBe("");
  });
});
