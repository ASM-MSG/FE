import { describe, expect, it } from "vitest";
import { getStepAfterAnalysis, resolveAnalysisFailure } from "./upload-wizard";

/**
 * MSG-329 재설계 — 구 4단계(select→highlight→blur→preview) 전이는 디자인 ver 11에서
 * 폐기됐다(블러 스텝 삭제, 하이라이트 분기는 로컬 5초 판정 → 서버 선분석 응답 기반).
 * 신 스텝: select → analyzing → (highlight) → preview.
 */
describe("getStepAfterAnalysis — 선분석 응답의 highlights로 다음 스텝을 판정한다 (B4)", () => {
  it("highlights가 있으면 하이라이트 스텝으로 간다", () => {
    expect(getStepAfterAnalysis([[0, 5.5]])).toBe("highlight");
    expect(
      getStepAfterAnalysis([
        [0, 4.25],
        [12, 18.5],
        [20, 27.5],
      ]),
    ).toBe("highlight");
  });

  it("빈 배열이면 하이라이트 스텝을 스킵하고 바로 미리보기로 간다 (5초 이하 영상)", () => {
    expect(getStepAfterAnalysis([])).toBe("preview");
  });

  it("null·undefined도 추천 없음으로 간주해 미리보기로 간다 — DTO 주석(없으면 null)과 티켓(빈 배열) 모두 커버 (리스크 8)", () => {
    expect(getStepAfterAnalysis(null)).toBe("preview");
    expect(getStepAfterAnalysis(undefined)).toBe("preview");
  });
});

describe("resolveAnalysisFailure — 선분석 실패 코드별 복귀 지점을 순수 함수로 판정한다 (B5)", () => {
  it("3502(분석 서버 문제)는 하이라이트 스텝의 직접 구간 지정 폴백 + 재시도 가능이다", () => {
    expect(resolveAnalysisFailure(3502)).toEqual({
      step: "highlight",
      kind: "analysis-error",
      retryable: true,
    });
  });

  it("3426(원본 파일 불량)은 선택 스텝 복귀 + 다른 파일 선택 유도(재시도 무의미)다", () => {
    expect(resolveAnalysisFailure(3426)).toEqual({
      step: "select",
      kind: "corrupt-file",
      retryable: false,
    });
  });

  it("3425(길이 초과)는 선택 스텝 복귀 + 길이 사유다", () => {
    expect(resolveAnalysisFailure(3425)).toEqual({
      step: "select",
      kind: "too-long",
      retryable: false,
    });
  });

  it("3413(크기 초과)은 선택 스텝 복귀 + 크기 사유다", () => {
    expect(resolveAnalysisFailure(3413)).toEqual({
      step: "select",
      kind: "too-large",
      retryable: false,
    });
  });

  it("그 외 코드·코드 없음(네트워크 등)은 3502와 같은 직접 지정 폴백이다 — 티켓 12의 기본 폴백 문장", () => {
    expect(resolveAnalysisFailure(9999)).toEqual({
      step: "highlight",
      kind: "analysis-error",
      retryable: true,
    });
    expect(resolveAnalysisFailure(undefined)).toEqual({
      step: "highlight",
      kind: "analysis-error",
      retryable: true,
    });
  });
});
