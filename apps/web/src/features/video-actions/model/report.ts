import { ApiError } from "@/shared/api/api-error";

/**
 * 영상 신고 도메인 로직 — 순수 함수/상수 (MSG-116 L1~L3 → MSG-411 실연동 이동).
 * widgets/cell-detail/model/report.ts에서 이동했다 — submitReport 목업은 실 API
 * (useReportVideo, POST /api/videos/{videoId}/reports)로 대체되어 삭제.
 * ApiError는 플랫폼 API를 참조하지 않는 정규화 에러 클래스다 — RN 재사용 대상.
 */

/** 신고 사유 옵션. id는 안정 키, label은 화면 노출 문구. [L1] */
export const REPORT_REASONS = [
  { id: "content", label: "부적절한 콘텐츠(선정성·폭력성 등)" },
  { id: "privacy", label: "사생활 침해(얼굴·번호판 등 노출)" },
  { id: "spam", label: "스팸 또는 도배성 콘텐츠" },
] as const;

/** 신고 사유 id 유니온 */
export type ReportReasonId = (typeof REPORT_REASONS)[number]["id"];

/**
 * 신고 제출 가능 여부를 판정한다. [L2·L3]
 * 사유가 선택되지 않았거나(null) 목록에 없는 id면 false, 유효한 id면 true.
 */
export const canSubmitReport = (
  reasonId: string | null,
): reasonId is ReportReasonId =>
  reasonId !== null && REPORT_REASONS.some((r) => r.id === reasonId);

/**
 * FE 사유 id → 서버 enum 매핑 (AC 6) — content→INAPPROPRIATE, privacy→PRIVACY,
 * spam→SPAM. COPYRIGHT·OTHER는 미노출(추정 4)이라 매핑 대상이 아니다.
 */
const SERVER_REASON_BY_ID = {
  content: "INAPPROPRIATE",
  privacy: "PRIVACY",
  spam: "SPAM",
} as const satisfies Record<ReportReasonId, string>;

export const toServerReportReason = (id: ReportReasonId): string =>
  SERVER_REASON_BY_ID[id];

/** 중복 신고의 백엔드 도메인 에러 코드 (티켓 명시) */
export const DUPLICATE_REPORT_DEVELOP_CODE = 11409;

/** 신고 실패 안내 — 문구 + 모달 닫기 여부 */
export interface ReportFailureNotice {
  message: string;
  shouldClose: boolean;
}

/**
 * 신고 실패 분기 (AC 8) — 중복 신고(developCode 11409 또는 HTTP 409, 이중 표기 방어)는
 * "이미 신고한 영상" 안내 + 모달 닫기, 그 외(자기 영상 400 포함)는 일반 실패 + 모달 유지.
 */
export const reportFailureNotice = (error: unknown): ReportFailureNotice => {
  if (
    error instanceof ApiError &&
    (error.developCode === DUPLICATE_REPORT_DEVELOP_CODE ||
      error.status === 409)
  ) {
    return {
      message: "이미 신고한 영상이에요. 검토 후 조치돼요.",
      shouldClose: true,
    };
  }
  return {
    message: "신고를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.",
    shouldClose: false,
  };
};
