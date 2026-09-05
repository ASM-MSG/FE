import { cn } from "@fillmap/ui-web";
import type {
  ApprovedEventStatus,
  ApprovedEventTabView,
} from "@/features/admin-events/model/approved-event";

interface EventStatusTabsProps {
  views: ApprovedEventTabView[];
  activeStatus: ApprovedEventStatus;
  onSelect: (status: ApprovedEventStatus) => void;
}

/**
 * 상태 탭 필 3종 (Figma 15579:2387~2389, AC 1·2) — 카운트는 탭과 무관한 전체 집계다.
 * ui-web `Chip`은 active에 Check 아이콘을 강제해(Figma 탭 필에 체크 없음) 부적합하다 —
 * 모바일 MSG-423과 같은 기각 사유로 로컬 구현이다.
 */
export const EventStatusTabs = ({
  views,
  activeStatus,
  onSelect,
}: EventStatusTabsProps) => (
  <div role="tablist" aria-label="행사 상태" className="flex gap-sm">
    {views.map((view) => {
      const active = view.status === activeStatus;
      return (
        <button
          key={view.status}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onSelect(view.status)}
          className={cn(
            "h-8 rounded-full px-md text-fm-label transition-colors",
            active
              ? "bg-primary font-semibold text-primary-foreground"
              : "bg-background text-foreground-body ring-1 ring-border hover:bg-surface",
          )}
        >
          {view.label}
        </button>
      );
    })}
  </div>
);
