import { describe, expect, it } from "vitest";
import {
  getStepAfterAnalysis,
  resolveAnalysisFailure,
  type UploadStep,
} from "./upload-wizard";

/**
 * 기준 5·30: 선분석 다음 스텝 판정과 실패 복귀 지점 판정이 웹 MSG-329 원본과 동등하다.
 *
 * 웹 원본은 변수 경로 동적 import로 로드한다 — 정적 import를 쓰지 않는 이유는
 * grid.parity.test.ts와 동일하다(웹 소스의 "@/…" 별칭이 모바일 tsconfig paths로 잘못
 * 해석되어 typecheck가 깨진다). 웹 파일이 이동하면 이 테스트가 깨진다 — 의도된 드리프트 감지.
 */
interface WebUploadWizardModule {
  getStepAfterAnalysis: typeof getStepAfterAnalysis;
  resolveAnalysisFailure: typeof resolveAnalysisFailure;
}
const WEB_UPLOAD_WIZARD_PATH = new URL(
  "../../../../../web/src/features/upload/model/upload-wizard.ts",
  import.meta.url,
).pathname;
const loadWebUploadWizard = (): Promise<WebUploadWizardModule> =>
  import(WEB_UPLOAD_WIZARD_PATH);

/** 판정 입력 전 조합 — 추천 유무 경계 + 실패 코드 전수(알려진 4종 + 미상) */
const HIGHLIGHT_INPUTS: (number[][] | null | undefined)[] = [
  [[3, 8]],
  [
    [3, 8],
    [14, 19],
  ],
  [],
  null,
  undefined,
];
const DEVELOP_CODES: (number | undefined)[] = [
  3426,
  3425,
  3413,
  3502,
  2403,
  undefined,
];

describe("getStepAfterAnalysis — 분석 결과로 다음 스텝을 판정한다 (기준 5)", () => {
  it("비어있지 않은 배열이면 하이라이트 스텝을 돌려준다 (기준 5)", () => {
    expect(getStepAfterAnalysis([[3, 8]])).toBe<UploadStep>("highlight");
  });

  it("빈 배열·null·undefined면 미리보기 스텝을 돌려준다 (기준 5)", () => {
    expect(getStepAfterAnalysis([])).toBe<UploadStep>("preview");
    expect(getStepAfterAnalysis(null)).toBe<UploadStep>("preview");
    expect(getStepAfterAnalysis(undefined)).toBe<UploadStep>("preview");
  });
});

describe("resolveAnalysisFailure — 실패 코드별 복귀 지점을 판정한다 (기준 30)", () => {
  it("3426(원본 불량)은 선택 스텝 복귀 + corrupt-file이다 (기준 30)", () => {
    expect(resolveAnalysisFailure(3426)).toEqual({
      step: "select",
      kind: "corrupt-file",
      retryable: false,
    });
  });

  it("3425(180초 초과)는 선택 스텝 복귀 + too-long이다 (기준 30)", () => {
    expect(resolveAnalysisFailure(3425)).toEqual({
      step: "select",
      kind: "too-long",
      retryable: false,
    });
  });

  it("3413(크기 초과)은 선택 스텝 복귀 + too-large다 (기준 30)", () => {
    expect(resolveAnalysisFailure(3413)).toEqual({
      step: "select",
      kind: "too-large",
      retryable: false,
    });
  });

  it("그 외 코드·코드 없음(네트워크)은 하이라이트 직접 지정 폴백 + 재시도 가능이다 (기준 30·32)", () => {
    expect(resolveAnalysisFailure(3502)).toEqual({
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

describe("웹 원본 동등성 (기준 44)", () => {
  it("추천 배열 전 조합에서 웹 getStepAfterAnalysis와 판정이 동일하다 (기준 5)", async () => {
    const web = await loadWebUploadWizard();

    for (const input of HIGHLIGHT_INPUTS) {
      expect(getStepAfterAnalysis(input)).toBe(web.getStepAfterAnalysis(input));
    }
  });

  it("실패 코드 전 조합에서 웹 resolveAnalysisFailure와 판정이 동일하다 (기준 30)", async () => {
    const web = await loadWebUploadWizard();

    for (const code of DEVELOP_CODES) {
      expect(resolveAnalysisFailure(code)).toEqual(
        web.resolveAnalysisFailure(code),
      );
    }
  });
});
