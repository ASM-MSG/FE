/**
 * 업로드 위저드 스텝 전이 — 웹 `features/upload/model/upload-wizard.ts`의 모바일 복제본
 * (MSG-424 포팅, `upload-wizard.parity.test.ts`가 동등성을 고정한다).
 * 웹을 import하지 않는 이유는 envelope.ts와 같다 — 웹 리팩터링이 모바일 **런타임**에
 * 직결되는 것을 막고, 드리프트는 번들이 아니라 테스트가 먼저 알리게 한다.
 *
 * 모바일 스텝 = 라우트다: select(/upload) → analyzing(/upload/analyzing) →
 * highlight(/upload/highlight) → preview(/upload/preview). 구 `/upload/blur`(블러 확인)는
 * 블러가 업로드 후처리로 빠지며 플로우에서 이탈했고, 서버가 블러를 끄며 MSG-567에서 라우트째
 * 삭제됐다.
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
