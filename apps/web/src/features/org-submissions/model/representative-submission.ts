import type { OrgSubmissionSummary } from "@/entities/org-submission/model/org-submission";

/**
 * 요약 카드의 대표 신청 선정 (MSG-545 AC 4, 추정 3) — 티켓의 "반려 우선"을 구체화한다:
 * 목록 순서(최신 제출 순)상 **첫 REJECTED** → 반려가 없으면 **첫 행** → 빈 목록이면 null.
 *
 * 요약 카드는 목록 행 "선택"에 반응하지 않는다(추정 8) — 항상 이 규칙의 결과다.
 * 순수 함수 — RN 재사용 대상.
 */
export const pickRepresentative = (
  submissions: OrgSubmissionSummary[],
): OrgSubmissionSummary | null =>
  submissions.find((submission) => submission.status === "REJECTED") ??
  submissions[0] ??
  null;
