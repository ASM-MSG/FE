import { cn } from "@fillmap/ui-web";
import { formatEventPeriod } from "@/features/event/model/event-period";
import type { OrgEventItemResponseDto } from "@/shared/api/generated/types.gen";

interface EventParentListProps {
  events: OrgEventItemResponseDto[];
  selectedId: number | null;
  onSelect: (event: OrgEventItemResponseDto) => void;
}

/**
 * 소속 이벤트 후보 목록 (AC 3·5 — Figma 15691:3611).
 * 행 재료는 서버 응답 그대로다: 이름 · 기간 · 장소 라벨(null이면 생략).
 * 시안의 우측 유형 태그(지역축제/팝업스토어)는 `OrgEventItemResponseDto`에 대응 필드가
 * 없어 렌더하지 않는다(Figma 오탐 방지 등재분).
 * 기간 라벨은 `formatEventPeriod`(features/event, KST 날짜부)를 재사용한다.
 */
export const EventParentList = ({
  events,
  selectedId,
  onSelect,
}: EventParentListProps) => (
  <div
    role="radiogroup"
    aria-label="승인 이벤트 목록"
    className="flex flex-col gap-xs"
  >
    {events.map((event) => {
      const selected = event.occurrenceId === selectedId;
      const meta = [
        formatEventPeriod(event.startsAt, event.endsAt),
        event.placeLabel,
      ]
        .filter((part) => part !== null)
        .join(" · ");

      return (
        <button
          key={event.occurrenceId}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onSelect(event)}
          className={cn(
            "flex items-center gap-sm rounded-md border p-sm text-left transition-colors",
            selected
              ? "border-primary bg-primary/5"
              : "border-border bg-background",
          )}
        >
          <span
            className={cn(
              "flex size-4.5 shrink-0 items-center justify-center rounded-full border",
              selected ? "border-primary" : "border-hairline-strong",
            )}
          >
            {selected && <span className="size-2.5 rounded-full bg-primary" />}
          </span>
          <span className="flex min-w-0 flex-col gap-xxs">
            <span className="text-fm-body-strong text-foreground">
              {event.name}
            </span>
            <span className="text-fm-caption text-foreground-muted">
              {meta}
            </span>
          </span>
        </button>
      );
    })}
  </div>
);
