import {
  rejectReasonLabel,
  type SubmissionRejection,
} from "@/features/admin-review/model/review-decision";

interface ProcessedResultNoteProps {
  /** 상태 라벨 — 상태 칩과 같은 정본(`submissionStatusChip`)에서 온다 */
  statusLabel: string;
  /** 마지막 반려의 항목·사유 — 이력에서 파생한다(`lastRejection`) */
  rejection: SubmissionRejection | null;
}

/**
 * 처리 완료 신청의 결과 표시 (AC 13, 승인 질문 4) — 심사 큐 CTA가 승인됨·반려됨 탭에서도
 * 상세로 이동하므로(552 실측) IN_REVIEW가 아닌 신청도 도달한다. 재조작은 서버가 409로
 * 거절하니 승인·반려 조작 자체를 걷고 결과만 보여 준다.
 */
export const ProcessedResultNote = ({
  statusLabel,
  rejection,
}: ProcessedResultNoteProps) => (
  <section
    aria-labelledby="processed-result-heading"
    className="flex flex-col gap-xs"
  >
    <h3 id="processed-result-heading" className="text-fm-title text-foreground">
      처리 결과
    </h3>
    <p className="text-fm-body text-foreground-body">
      {`이미 ${statusLabel} 신청이라 승인·반려 조작이 없습니다.`}
    </p>
    {rejection !== null && (
      <div className="mt-xs flex flex-col gap-xxs rounded-sm bg-surface-soft p-sm">
        <p className="text-fm-label text-foreground-muted">반려 항목</p>
        <p className="text-fm-body-strong text-foreground">
          {rejection.reasonCodes.map(rejectReasonLabel).join(" · ")}
        </p>
        <p className="mt-xs text-fm-label text-foreground-muted">반려 사유</p>
        <p className="text-fm-body whitespace-pre-line text-foreground-body">
          {rejection.reasonText}
        </p>
      </div>
    )}
  </section>
);
