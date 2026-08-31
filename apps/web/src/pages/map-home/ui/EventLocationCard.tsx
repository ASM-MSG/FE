import { Thumbnail } from "@fillmap/ui-web";
import { ChevronRight } from "lucide-react";
import type { EventLocationCardView } from "@/features/event/model/event-overview";

interface EventLocationCardProps {
  card: EventLocationCardView;
}

/**
 * 행사 위치 카드 (MSG-517 AC 9, Figma 15518:5932 계열) — 썸네일 + 위치명 +
 * "유형 · 운영시간" + "영상 N" 배지 + chevron.
 * **표시 전용** (추정 6) — 클릭·위치 선택(영상 피드 진입)은 MSG-518 슬롯이라
 * onClick 없이 chevron만 그린다. 이미지 null·로드 실패는 ui-web Thumbnail 폴백 (AC 9).
 */
export const EventLocationCard = ({ card }: EventLocationCardProps) => (
  <li className="flex items-center gap-sm rounded-md border border-border bg-background p-sm">
    <span className="relative size-9 shrink-0 overflow-hidden rounded-sm bg-surface">
      <Thumbnail src={card.imageUrl} loading="lazy" />
    </span>
    <span className="flex min-w-0 flex-1 flex-col gap-xxs">
      <span className="truncate text-fm-body-strong text-foreground">
        {card.name}
      </span>
      <span className="truncate text-fm-caption text-foreground-muted">
        {card.meta}
      </span>
    </span>
    <span className="shrink-0 rounded-full bg-event-tint px-sm py-0.5 text-fm-caption font-semibold text-primary">
      {card.videoBadge}
    </span>
    <ChevronRight
      aria-hidden
      className="size-4 shrink-0 text-foreground-muted"
    />
  </li>
);
