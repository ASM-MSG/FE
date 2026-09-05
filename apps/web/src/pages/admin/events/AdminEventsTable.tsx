import type { KeyboardEvent } from "react";
import { cn } from "@fillmap/ui-web";
import {
  eventStatusBadge,
  formatRowPeriod,
} from "@/features/admin-events/model/approved-event";
import type { AdminApprovedEventItemResponseDto } from "@/shared/api/generated/types.gen";
import { EventStatusBadge } from "./EventStatusBadge";

interface AdminEventsTableProps {
  events: AdminApprovedEventItemResponseDto[];
  selectedId: number | null;
  onSelect: (submissionId: number) => void;
}

const COLUMNS = [
  { label: "행사", className: "w-[34%]" },
  { label: "주최 기관", className: "w-[20%]" },
  { label: "기간", className: "w-[32%]" },
  { label: "상태", className: "w-[14%]" },
];

/**
 * 승인 행사 목록 테이블 (Figma 15579:2423~2429, AC 3·4).
 * 칼럼은 4종 — Figma의 "위치 요약"·"승인일"은 목록 DTO에 필드가 없어 상세 카드로 옮겼다
 * (스펙 질문 1 기본안). 선택 가능한 행이라 `role="grid"` + 행 `aria-selected`로 알리고
 * 마우스·키보드(Enter·Space) 양쪽으로 선택된다.
 */
export const AdminEventsTable = ({
  events,
  selectedId,
  onSelect,
}: AdminEventsTableProps) => {
  const handleKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    submissionId: number,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(submissionId);
  };

  return (
    <table
      role="grid"
      aria-label="승인 행사 목록"
      className="w-full table-fixed"
    >
      <thead>
        <tr className="bg-surface">
          {COLUMNS.map((column) => (
            <th
              key={column.label}
              scope="col"
              className={cn(
                "h-9.5 px-2.5 text-left text-fm-label font-medium text-foreground-muted",
                column.className,
              )}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {events.map((event) => {
          const selected = event.submissionId === selectedId;
          return (
            <tr
              key={event.submissionId}
              aria-selected={selected}
              tabIndex={0}
              onClick={() => onSelect(event.submissionId)}
              onKeyDown={(keyEvent) =>
                handleKeyDown(keyEvent, event.submissionId)
              }
              className={cn(
                "h-23 cursor-pointer border-b border-border transition-colors",
                selected ? "bg-surface-soft" : "hover:bg-surface-soft",
              )}
            >
              <td className="relative px-2.5">
                {selected && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-full w-0.75 bg-primary"
                  />
                )}
                <span className="text-fm-body-strong text-foreground">
                  {event.title}
                </span>
              </td>
              <td className="px-2.5 text-fm-body text-foreground-body">
                {event.organizerName}
              </td>
              <td className="px-2.5 text-fm-body text-foreground-muted">
                {formatRowPeriod(event.startsOn, event.endsOn)}
              </td>
              <td className="px-2.5">
                <EventStatusBadge {...eventStatusBadge(event)} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
