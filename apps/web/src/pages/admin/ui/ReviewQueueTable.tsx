import { cn } from "@fillmap/ui-web";
import {
  formatLocationCountLabel,
  formatScheduleLabel,
  submissionStatusView,
  type SubmissionStatusTone,
} from "@/features/admin-review/model/submission-view";
import type { AdminEventSubmissionItemResponseDto } from "@/shared/api/generated/types.gen";
import { formatKstReceiptTime } from "@/shared/format";

interface ReviewQueueTableProps {
  submissions: AdminEventSubmissionItemResponseDto[];
  selectedId: number | null;
  onSelect: (submissionId: number) => void;
}

const TONE_CLASSES: Record<SubmissionStatusTone, string> = {
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
  error: "bg-error/15 text-error",
};

const COLUMNS = ["행사", "주최 기관", "일정·영역", "접수", "상태"];

/**
 * 대기 신청 테이블 (MSG-552 AC 6·7) — SOURCE: Figma "[v2] [관리자 2] 행사 심사 큐"
 * (node 15525:9124). 정렬은 서버 응답 순서(접수 최신순 고정)를 그대로 쓴다 — FE 재정렬 없음.
 *
 * 행 선택은 마우스는 행 전체 클릭, 키보드는 행사명 버튼으로 닿는다(포커스 가능한 요소가
 * 행마다 하나). 선택 행은 좌측 primary 테두리 + 흰 배경으로 구분한다.
 */
export const ReviewQueueTable = ({
  submissions,
  selectedId,
  onSelect,
}: ReviewQueueTableProps) => (
  <table className="w-full border-separate border-spacing-0 text-left">
    <caption className="sr-only">대기 신청 목록</caption>
    <thead>
      <tr className="bg-surface-soft">
        {COLUMNS.map((column) => (
          <th
            key={column}
            scope="col"
            className="border-b border-border px-sm py-xs text-fm-caption font-medium text-foreground-muted first:pl-md last:pr-md"
          >
            {column}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {submissions.map((submission) => {
        const selected = submission.id === selectedId;
        const statusView = submissionStatusView(submission.status);
        return (
          <tr
            key={submission.id}
            aria-selected={selected}
            onClick={() => onSelect(submission.id)}
            className={cn(
              "cursor-pointer transition-colors",
              selected ? "bg-background" : "bg-surface-soft",
            )}
          >
            <td
              className={cn(
                "border-b border-l-2 border-border py-md pl-md pr-sm",
                selected ? "border-l-primary" : "border-l-transparent",
              )}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(submission.id);
                }}
                className="text-left text-fm-base font-semibold text-foreground"
              >
                {submission.title}
              </button>
            </td>
            <td className="border-b border-border px-sm py-md text-fm-body text-foreground-body">
              {submission.organizerName}
            </td>
            <td className="border-b border-border px-sm py-md text-fm-body text-foreground-muted">
              {`${formatScheduleLabel(submission.startsOn, submission.endsOn)} · ${formatLocationCountLabel(submission.locationCount)}`}
            </td>
            <td className="border-b border-border px-sm py-md text-fm-body text-foreground-muted">
              {formatKstReceiptTime(submission.createdAt)}
            </td>
            <td className="border-b border-border py-md pl-sm pr-md">
              <span
                className={cn(
                  "inline-flex items-center rounded-xs px-xs py-0.5 text-fm-caption font-medium",
                  TONE_CLASSES[statusView.tone],
                )}
              >
                {statusView.label}
              </span>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);
