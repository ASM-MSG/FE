import type {
  OrgSubmissionStatus,
  OrgSubmissionStatusCounts,
  OrgSubmissionSummary,
} from "@/entities/org-submission/model/org-submission";

/**
 * 신청 상태의 라벨·톤 매핑과 목록 필터 (MSG-545 AC 1·2·3).
 * 순수 함수만 — 플랫폼(window·router)·지도 SDK 무의존이라 RN 재사용 대상이다.
 */

/** 칩·숫자 색의 시맨틱 톤 — 미지 상태는 톤 없이(null) 원문 라벨만 쓴다 */
export type SubmissionStatusTone = "warning" | "success" | "error";

const STATUS_META: Record<
  OrgSubmissionStatus,
  { label: string; tone: SubmissionStatusTone }
> = {
  IN_REVIEW: { label: "심사 중", tone: "warning" },
  APPROVED: { label: "승인됨", tone: "success" },
  REJECTED: { label: "반려됨", tone: "error" },
};

/** 목록 DTO의 status는 plain string이라 확정 3값인지 가드로 좁힌다 (추정 6) */
export const isOrgSubmissionStatus = (
  status: string,
): status is OrgSubmissionStatus => Object.hasOwn(STATUS_META, status);

/** 상태 라벨 — 미지 값은 원문을 그대로 보여 행을 깨뜨리지 않는다 (AC 2, 추정 6) */
export const submissionStatusLabel = (status: string): string =>
  isOrgSubmissionStatus(status) ? STATUS_META[status].label : status;

/** 상태 톤 — 미지 값은 색을 주지 않는다(중립 렌더) */
export const submissionStatusTone = (
  status: string,
): SubmissionStatusTone | null =>
  isOrgSubmissionStatus(status) ? STATUS_META[status].tone : null;

/** 상태 필터 칩 4종 — "전체"는 서버 순서의 원본을 그대로 쓴다 */
export type SubmissionFilter = "ALL" | OrgSubmissionStatus;

/** 필터 칩 렌더 순서 (Figma 15525:8652: 전체 · 심사 중 · 승인됨 · 반려됨) */
export const SUBMISSION_FILTERS: {
  value: SubmissionFilter;
  label: string;
}[] = [
  { value: "ALL", label: "전체" },
  { value: "IN_REVIEW", label: STATUS_META.IN_REVIEW.label },
  { value: "APPROVED", label: STATUS_META.APPROVED.label },
  { value: "REJECTED", label: STATUS_META.REJECTED.label },
];

/**
 * 상태 필터 적용 (AC 3) — 목록에 페이지네이션이 없어(실측) 클라이언트 필터로 충분하다.
 * 미지 status 행은 "전체"에만 잡힌다 (추정 6).
 */
export const filterSubmissions = (
  submissions: OrgSubmissionSummary[],
  filter: SubmissionFilter,
): OrgSubmissionSummary[] =>
  filter === "ALL"
    ? submissions
    : submissions.filter((submission) => submission.status === filter);

/**
 * 전체 신청 수 (AC 1, 추정 2) — 응답에 "전체" 필드가 없어 counts 3필드를 합산한다.
 * `submissions.length`와 동치지만(페이지네이션 없음) 카운트의 정본은 counts DTO다.
 */
export const totalSubmissionCount = (
  counts: OrgSubmissionStatusCounts,
): number => counts.inReview + counts.approved + counts.rejected;
