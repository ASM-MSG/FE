import { cn } from "@fillmap/ui-web";
import type { EventStatusBadgeView } from "@/features/admin-events/model/approved-event";

/** 색조별 필 스타일 — 판정은 `eventStatusBadge`(순수)가 하고 여기서는 옮기기만 한다 */
const TONE_CLASS: Record<EventStatusBadgeView["tone"], string> = {
  exposed: "bg-success/10 text-success",
  upcoming: "bg-primary/10 text-primary",
  ended: "bg-surface text-foreground-muted",
  unpublished: "bg-error/10 text-error",
};

/**
 * 상태 배지 (Figma 15582:2399·2401·2403 — 노출 중/예정/종료) + 중지 색조.
 * 중지 상태는 Figma에 없어 error 색조로 확장했다(스펙 추정 4). ui-web `CellBadge`는
 * 격자 점령 표기 전용(고정 문구·아이콘)이라 재사용 대상이 아니다.
 */
export const EventStatusBadge = ({ label, tone }: EventStatusBadgeView) => (
  <span
    className={cn(
      "inline-flex h-7 items-center rounded-full px-2.5 text-fm-caption font-medium",
      TONE_CLASS[tone],
    )}
  >
    {label}
  </span>
);
