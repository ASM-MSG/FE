import { MAX_DURATION_SEC } from "./upload-validation";
import type { UploadStage } from "./upload-orchestration";

/**
 * 분석·확정 단계의 표시 문구 (기준 2·27·31·33·34) — 웹 `use-upload-wizard.ts`의
 * STAGE_FAILURE_MESSAGES·SELECT_FAILURE_MESSAGES 대응. 화면이 문구를 소유하면
 * 분석 화면(단계 실패)과 선택 화면(파일 문제)이 같은 사유를 다르게 쓰게 되므로 여기 모은다.
 */

/** 분석 로딩 화면 문구 (Figma 14824:476) */
export const ANALYZING_COPY = {
  title: "잠시만 기다려주세요",
  description: "AI가 영상을 분석해 하이라이트 추천 구간을 생성하고 있어요",
  /** 예상 소요 — 실제 진행률 정보가 없어 캡션으로만 안내한다 (D7) */
  estimate: "보통 10~20초 정도 걸려요",
  failureTitle: "분석을 시작하지 못했어요",
} as const;

/** 업로드 완료 화면 문구 (Figma 14824:486) */
export const UPLOAD_COMPLETE_COPY = {
  title: "업로드 완료!",
  /** 웹 MSG-476 문구 미러 (MSG-567 AC 2) — 블러 후처리 안내는 서버가 블러를 끄며 삭제됐다 */
  description: "영상이 지도에 등록됐어요. 내 격자에서 확인해보세요",
  confirm: "확인",
} as const;

/** 단계별 실패 안내 (기준 31·34) — 재시도는 성공한 단계를 건너뛴다 */
export const STAGE_FAILURE_MESSAGES: Record<UploadStage, string> = {
  presign: "업로드 준비에 실패했어요",
  s3put: "영상 업로드에 실패했어요",
  finalize: "게시에 실패했어요",
};

/** 선분석 실패 중 선택 화면 복귀 사유 (기준 33) — 파일 자체 문제 */
export const SELECT_FAILURE_MESSAGES = {
  "corrupt-file": "영상을 분석할 수 없는 파일이에요. 다른 파일을 선택해주세요",
  "too-long": `영상이 너무 길어요 — 최대 ${MAX_DURATION_SEC}초까지 올릴 수 있어요`,
  "too-large": "파일이 너무 커요 — 500MB 이하 영상만 올릴 수 있어요",
} as const;

/** 분석 서버 오류·네트워크 실패로 직접 지정 폴백에 진입했을 때의 안내 (기준 32) */
export const MANUAL_FALLBACK_NOTICE =
  "AI 분석에 실패했어요. 직접 구간을 지정하거나 다시 시도할 수 있어요";
