import { Thumbnail } from "@fillmap/ui-web";
import { ChevronRight } from "lucide-react";
import type { EventLocationCardView } from "@/features/event/model/event-overview";

interface EventLocationCardProps {
  card: EventLocationCardView;
  /** 카드 클릭 — 그 위치를 선택해 영상 상세로 진입한다 (MSG-534 기준 1) */
  onSelect: () => void;
}

/**
 * 행사 위치 카드 (MSG-517 AC 9, Figma 15518:5932 계열) — 썸네일 + 위치명 +
 * "유형 · 운영시간" + "영상 N" 배지 + chevron.
 * 행 전체가 button이다 (MSG-534 기준 2) — `<ul>` 시맨틱 보존을 위해 `<li>`는 그대로
 * 두고 안쪽에 button을 두며, 접근명은 위치명 + 맥락("… 위치 영상 보기")이다.
 * 이미지 null·로드 실패는 ui-web Thumbnail 폴백 (AC 9).
 */
export const EventLocationCard = ({
  card,
  onSelect,
}: EventLocationCardProps) => (
  <li>
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${card.name} 위치 영상 보기`}
      className="flex w-full items-center gap-sm rounded-md border border-border bg-background p-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
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
    </button>
  </li>
);
