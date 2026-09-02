import { Button, RetryNotice, Skeleton } from "@fillmap/ui-web";
import type { OrgSubmissionSummary } from "@/entities/org-submission/model/org-submission";
import type { SubmissionDetailResult } from "@/features/org-submissions/api/use-submission-detail-query";
import { submissionTimelineText } from "@/features/org-submissions/model/submission-format";
import { SubmissionStatusChip } from "@/features/org-submissions/ui/SubmissionStatusChip";

/**
 * SOURCE: Figma "[v2] [행사 운영자 2] 홈·신청 현황" (15525:8652) 우측 요약 카드 +
 * 빈 상태(15583:2398)의 빈 변형.
 *
 * 대표 신청(첫 반려 → 없으면 첫 행)의 상태·일자·반려 사유를 싣는다. 목록 행 "선택"에는
 * 반응하지 않는다(추정 8) — 대표는 항상 선정 규칙의 결과다.
 *
 * 반려 사유·이력은 상세 API에만 있어(실측) 대표가 REJECTED일 때만 병행 조회한다:
 * 로딩은 Skeleton, 실패는 사유 영역 한정 RetryNotice로 수렴하고 상태·행사명은 그대로 남는다.
 */
const OPERATOR_CONTACT = "운영자 문의 support@fillmap.kr";

interface OrgSubmissionSummaryCardProps {
  /** 대표 신청 — 신청 0건이면 null(빈 변형) */
  submission: OrgSubmissionSummary | null;
  detail: SubmissionDetailResult;
  onOpenDetail: (submissionId: number) => void;
}

const RejectionBox = ({ detail }: { detail: SubmissionDetailResult }) => {
  const rejection = detail.detail?.rejection ?? null;

  if (detail.isError) {
    return (
      <RetryNotice
        message="반려 사유를 불러오지 못했어요"
        onRetry={detail.retry}
      />
    );
  }

  if (detail.isPending) {
    return (
      <div className="flex flex-col gap-xs rounded-sm border border-border p-sm">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
    );
  }

  if (rejection === null) return null;

  return (
    <div className="flex flex-col gap-xs rounded-sm border border-border p-sm">
      <p className="text-fm-label font-semibold text-error">반려 사유</p>
      <p className="text-fm-body text-foreground-body">
        {rejection.reasonText}
      </p>
    </div>
  );
};

export const OrgSubmissionSummaryCard = ({
  submission,
  detail,
  onOpenDetail,
}: OrgSubmissionSummaryCardProps) => (
  <section
    aria-label="심사 결과 요약"
    className="flex min-h-150 w-84 shrink-0 flex-col gap-sm rounded-sm border border-border bg-background p-lg"
  >
    {submission === null ? (
      <div className="flex flex-1 flex-col items-center justify-center gap-xxs">
        <p className="text-fm-body-strong text-foreground">신청을 선택하면</p>
        <p className="text-fm-body text-foreground-muted">
          심사 결과가 여기에 표시됩니다
        </p>
        <p className="mt-xl text-fm-body text-foreground-muted">
          {OPERATOR_CONTACT}
        </p>
      </div>
    ) : (
      <>
        <span className="w-fit">
          <SubmissionStatusChip status={submission.status} />
        </span>
        <p className="text-fm-title text-foreground">{submission.title}</p>
        <p className="text-fm-body text-foreground-muted">
          {/* history는 대표가 REJECTED일 때만 상세 조회로 채워진다(OrgHomePage 게이팅) — 비반려 대표는 항상 null */}
          {submissionTimelineText(
            submission.updatedAt,
            detail.detail?.history ?? null,
          )}
        </p>

        {submission.status === "REJECTED" && (
          <div className="mt-xs">
            <RejectionBox detail={detail} />
          </div>
        )}

        <Button
          text="심사 결과 상세 보기"
          className="mt-md w-full"
          onClick={() => onOpenDetail(submission.id)}
        />
        <p className="mt-auto text-center text-fm-body text-foreground-muted">
          {OPERATOR_CONTACT}
        </p>
      </>
    )}
  </section>
);
