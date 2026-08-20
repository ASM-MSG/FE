import { ApiError } from "../../../shared/api/api-error";

/**
 * 영상 신고 도메인 로직 (MSG-431 L9~L11) — 웹
 * `apps/web/src/features/video-actions/model/report.ts` 포팅분. 순수 함수/상수이며
 * 동등성은 `report.parity.test.ts`가 고정한다.
 *
 * 이 파일이 구 `features/grid-detail/model/report-types.ts`(mock 5종
 * HARMFUL/SEXUAL/SPAM/PRIVACY/ETC)를 대체한다 — 서버 enum은 INAPPROPRIATE·PRIVACY·SPAM·
 * COPYRIGHT·OTHER라 mock 코드는 그대로 보낼 수 없었고, 웹과 카탈로그가 갈리면 같은 신고가
 * 플랫폼별로 다른 사유로 접수된다(스펙 리스크 R3 해소).
 *
 * `ApiError`는 플랫폼 API를 참조하지 않는 정규화 에러 클래스다 — RN 재사용 대상.
 */

/** 신고 사유 옵션. id는 안정 키, label은 화면 노출 문구. [L9] */
export const REPORT_REASONS = [
  { id: "content", label: "부적절한 콘텐츠(선정성·폭력성 등)" },
  { id: "privacy", label: "사생활 침해(얼굴·번호판 등 노출)" },
  { id: "spam", label: "스팸 또는 도배성 콘텐츠" },
] as const;

/** 신고 사유 id 유니온 */
export type ReportReasonId = (typeof REPORT_REASONS)[number]["id"];

/**
 * 신고 제출 가능 여부를 판정한다. [L10]
 * 사유가 선택되지 않았거나(null) 목록에 없는 id면 false, 유효한 id면 true.
 */
export const canSubmitReport = (
  reasonId: string | null,
): reasonId is ReportReasonId =>
  reasonId !== null && REPORT_REASONS.some((r) => r.id === reasonId);

/**
 * FE 사유 id → 서버 enum 매핑 — content→INAPPROPRIATE, privacy→PRIVACY, spam→SPAM.
 * COPYRIGHT·OTHER는 미노출이라 매핑 대상이 아니다.
 */
const SERVER_REASON_BY_ID = {
  content: "INAPPROPRIATE",
  privacy: "PRIVACY",
  spam: "SPAM",
} as const satisfies Record<ReportReasonId, string>;

export const toServerReportReason = (id: ReportReasonId): string =>
  SERVER_REASON_BY_ID[id];

/** 중복 신고의 백엔드 도메인 에러 코드 (티켓 명시 — 생성 스키마에는 없다) */
export const DUPLICATE_REPORT_DEVELOP_CODE = 11409;

/** 신고 실패 안내 — 문구 + 모달 닫기 여부 */
export interface ReportFailureNotice {
  message: string;
  shouldClose: boolean;
}

/**
 * 신고 실패 분기 [L11] — 중복 신고(developCode 11409 또는 HTTP 409, 이중 표기 방어)는
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
