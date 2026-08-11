/**
 * 업로드 위저드 스텝 전이 — 순수 로직 (MSG-329 재편, 디자인 ver 11).
 * 플랫폼 API(window·File·DOM 등)를 참조하지 않는다 — RN 재사용 대상.
 * 구 4단계(select→highlight→blur→preview)는 폐기됐다: 업로드 전 블러 확인 스텝이 사라지고,
 * 하이라이트 분기는 로컬 5초 판정이 아니라 서버 선분석(highlight-preview) 응답으로 결정된다.
 */

/** 업로드 위저드 스텝 — 선택 → (선분석 로딩) → 하이라이트 → 미리보기. */
export type UploadStep = "select" | "analyzing" | "highlight" | "preview";

/**
 * 선분석 응답의 highlights로 로딩 다음 스텝을 판정한다. [B4]
 * 빈 배열(5초 이하 등 추천 없음)·null·undefined(DTO 주석: 없으면 null — 리스크 8)는
 * 하이라이트 스텝을 스킵하고 바로 미리보기로 간다.
 */
export const getStepAfterAnalysis = (
  highlights: number[][] | null | undefined,
): UploadStep =>
  highlights !== null && highlights !== undefined && highlights.length > 0
    ? "highlight"
    : "preview";

/**
 * 선분석 실패의 복귀 지점·사유 — developCode별 분기 (B5, 티켓 12).
 * step으로 좁히면 kind가 함께 좁혀지는 판별 유니언 — UI 안내 문구 분기용.
 */
export type AnalysisFailure =
  | {
      /** 3502류 — 하이라이트 스텝의 직접 지정 폴백 */
      step: "highlight";
      kind: "analysis-error";
      retryable: true;
    }
  | {
      /** 파일 자체 문제 — 선택 스텝 복귀 */
      step: "select";
      kind: "corrupt-file" | "too-long" | "too-large";
      retryable: false;
    };

/**
 * 선분석 실패 코드별 복귀 지점을 판정한다. [B5]
 * - 3426(원본 불량)·3425(180초 초과)·3413(크기 초과): 파일 자체 문제 — 선택 스텝 복귀
 * - 3502(분석 서버 문제)·그 외/코드 없음(네트워크 등): 직접 구간 지정 폴백 + 재시도 가능
 *   (티켓 12의 기본 문장 "분석 실패 시 직접 구간 지정으로 폴백")
 */
export const resolveAnalysisFailure = (
  developCode?: number,
): AnalysisFailure => {
  switch (developCode) {
    case 3426:
      return { step: "select", kind: "corrupt-file", retryable: false };
    case 3425:
      return { step: "select", kind: "too-long", retryable: false };
    case 3413:
      return { step: "select", kind: "too-large", retryable: false };
    default:
      return { step: "highlight", kind: "analysis-error", retryable: true };
  }
};
