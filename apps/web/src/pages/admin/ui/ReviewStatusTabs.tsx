import { cn } from "@fillmap/ui-web";
import {
  SUBMISSION_STATUS_TABS,
  type SubmissionStatus,
} from "@/features/admin-review/model/submission-view";
import type { EventSubmissionStatusCountsResponseDto } from "@/shared/api/generated/types.gen";

interface ReviewStatusTabsProps {
  status: SubmissionStatus;
  /** 상태별 전체 건수 — 첫 조회 도착 전이면 null(라벨만 표기) */
  counts: EventSubmissionStatusCountsResponseDto | null;
  onSelect: (status: SubmissionStatus) => void;
}

/**
 * 심사 큐 상태 탭 (MSG-552 AC 5·10) — SOURCE: Figma "[v2] [관리자 2] 행사 심사 큐"
 * (node 15525:9124). 활성 탭만 채움(primary) pill이고 나머지는 외곽선 pill이다.
 *
 * ui-web `Chip`을 쓰지 않는다 — Chip은 active에 Check 아이콘을 강제하고 Figma 탭에는
 * 아이콘이 없다(스펙 Figma 오탐 방지 마지막 항목). 콘솔 인지 1회 사용이라 승격도 아니다.
 */
export const ReviewStatusTabs = ({
  status,
  counts,
  onSelect,
}: ReviewStatusTabsProps) => (
  <div role="group" aria-label="신청 상태 필터" className="flex gap-xs">
    {SUBMISSION_STATUS_TABS.map((tab) => {
      const active = tab.status === status;
      return (
        <button
          key={tab.status}
          type="button"
          aria-pressed={active}
          onClick={() => onSelect(tab.status)}
          className={cn(
            "h-9 rounded-full px-md text-fm-body-strong transition-colors",
            active
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-background text-foreground-body",
          )}
        >
          {counts === null ? tab.label : `${tab.label} ${counts[tab.countKey]}`}
        </button>
      );
    })}
  </div>
);
