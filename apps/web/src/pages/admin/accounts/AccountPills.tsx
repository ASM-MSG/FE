import { cn } from "@fillmap/ui-web";
import type { QueuePillView } from "@/features/admin-accounts/model/account-view";

interface AccountPillsProps<TValue extends string> {
  /** 스크린리더용 그룹 이름 — 한 화면에 pill 행이 둘 이상 있다 */
  label: string;
  views: QueuePillView<TValue>[];
  active: TValue;
  onSelect: (value: TValue) => void;
}

/**
 * 필 탭 행 (Figma 15579:2326 상태 pill) — 페이지 내부 탭·큐 상태 필터가 공유한다.
 * 이 화면에서 세 곳(구획 탭·발급 요청 상태·아이디 변경 상태)이 같은 모양이라
 * 한 컴포넌트로 둔다.
 *
 * ui-web `Chip`은 active에 Check 아이콘을 강제해(Figma pill에 체크 없음) 부적합하다 —
 * MSG-552·554와 같은 기각 사유로 로컬 구현이며, 세 번째 반복이라 승격 후보로 기록됐다.
 */
export const AccountPills = <TValue extends string>({
  label,
  views,
  active,
  onSelect,
}: AccountPillsProps<TValue>) => (
  <div role="tablist" aria-label={label} className="flex gap-sm">
    {views.map((view) => {
      const selected = view.value === active;
      return (
        <button
          key={view.value}
          type="button"
          role="tab"
          aria-selected={selected}
          onClick={() => onSelect(view.value)}
          className={cn(
            "h-8 rounded-full px-md text-fm-label transition-colors",
            selected
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
