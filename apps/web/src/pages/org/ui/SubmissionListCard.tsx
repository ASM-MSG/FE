import { Button } from "@fillmap/ui-web";
import type { OrgSubmissionSummary } from "@/entities/org-submission/model/org-submission";
import { formatSubmissionDateRange } from "@/features/org-submissions/model/submission-format";
import { submissionTypeLabel } from "@/features/org-submissions/model/submission-status";
import { SubmissionStatusChip } from "@/features/org-submissions/ui/SubmissionStatusChip";

interface SubmissionListCardProps {
  submission: OrgSubmissionSummary;
  /** 목록 내 순번 — 시안의 01·02·03 뱃지 (서버 순서 기준 1부터) */
  position: number;
  onOpenDetail: (submissionId: number) => void;
  onReapply: (submissionId: number) => void;
}

/**
 * SOURCE: Figma "[v2] [행사 운영자 2] 내 신청 목록" (15525:9602) 행 카드.
 *
 * 시안의 신청일·"위치 N곳 · 격자 N칸" 칩·반려 사유 한 줄은 **렌더하지 않는다** — 목록
 * 응답(`EventSubmissionSummaryResponseDto`)에 없는 값이다(실측, BE 환류 완료). 같은 이유로
 * 우측 버튼은 "신청 취소"(취소 API 부재)·"지도 보기"(좌표 파생 근거 없음)를 빼고
 * "상세 보기"와 반려 행 전용 "수정 후 재신청"만 둔다 (추정 2).
 *
 * 행사명 자체가 버튼이라 키보드로 상세에 도달한다 — 행 전체를 버튼으로 감싸면 안쪽
 * "수정 후 재신청" 버튼이 중첩된다.
 */
export const SubmissionListCard = ({
  submission,
  position,
  onOpenDetail,
  onReapply,
}: SubmissionListCardProps) => (
  <li className="flex items-center gap-md rounded-sm border border-border bg-background px-lg py-md">
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-fm-label text-foreground-body">
      {String(position).padStart(2, "0")}
    </span>

    <div className="flex min-w-0 flex-1 flex-col gap-xxs">
      <div className="flex items-center gap-xs">
        <button
          type="button"
          onClick={() => onOpenDetail(submission.id)}
          className="truncate text-left text-fm-base font-medium text-foreground hover:underline"
        >
          {submission.title}
        </button>
        <SubmissionStatusChip status={submission.status} />
      </div>
      <div className="flex flex-wrap items-center gap-xs text-fm-body text-foreground-muted">
        <span>{`행사 ${formatSubmissionDateRange(submission.startsOn, submission.endsOn)}`}</span>
        <span className="rounded-full bg-surface px-xs py-0.5 text-fm-label text-foreground-body">
          {submissionTypeLabel(submission.type)}
        </span>
      </div>
    </div>

    <div className="flex shrink-0 items-center gap-xs">
      <Button
        text="상세 보기"
        variant="secondary"
        size="sm"
        className="border border-border"
        onClick={() => onOpenDetail(submission.id)}
      />
      {submission.status === "REJECTED" && (
        <Button
          text="수정 후 재신청"
          size="sm"
          onClick={() => onReapply(submission.id)}
        />
      )}
    </div>
  </li>
);
