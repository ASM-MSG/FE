import { cn } from "@fillmap/ui-web";
import {
  SUBMISSION_FILTERS,
  type SubmissionFilter,
} from "@/features/org-submissions/model/submission-status";

interface SubmissionFilterPillsProps {
  filter: SubmissionFilter;
  onChange: (filter: SubmissionFilter) => void;
}

/**
 * SOURCE: Figma "[v2] [행사 운영자 2] 내 신청 목록" (15525:9602) 상단 상태 필터 칩 4종 —
 * 활성만 채움(primary) pill, 나머지는 외곽선 pill이다.
 *
 * ui-web `Chip`을 쓰지 않는다 — Chip은 active에 Check 아이콘을 강제하고 시안 칩에는
 * 아이콘이 없다(MSG-552 `ReviewStatusTabs` 선례). 필터 정본은 `SUBMISSION_FILTERS`다.
 */
export const SubmissionFilterPills = ({
  filter,
  onChange,
}: SubmissionFilterPillsProps) => (
  <div role="group" aria-label="신청 상태 필터" className="flex gap-xs">
    {SUBMISSION_FILTERS.map(({ value, label }) => {
      const active = value === filter;
      return (
        <button
          key={value}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(value)}
          className={cn(
            "h-9 rounded-full px-md text-fm-body-strong transition-colors",
            active
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-background text-foreground-body",
          )}
        >
          {label}
        </button>
      );
    })}
  </div>
);
