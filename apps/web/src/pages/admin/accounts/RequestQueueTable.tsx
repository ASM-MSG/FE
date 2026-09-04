import { cn } from "@fillmap/ui-web";
import { accountRequestStatusView } from "@/features/admin-accounts/model/account-view";
import type { AdminOrgAccountRequestItemResponseDto } from "@/shared/api/generated/types.gen";
import { formatKstReceiptTime } from "@/shared/format";
import { StatusChip } from "./StatusChip";

interface RequestQueueTableProps {
  requests: AdminOrgAccountRequestItemResponseDto[];
  selectedId: number | null;
  onSelect: (requestId: number) => void;
}

const COLUMNS = ["기관", "담당자", "요청 행사", "요청일", "상태"];

/**
 * 계정 발급 요청 테이블 (MSG-551 AC 11 — Figma 15579:2326 좌측 카드).
 * 정렬은 서버 응답 순서(마지막 접수 최신순 고정)를 그대로 쓴다 — FE 재정렬 없음.
 *
 * "요청일"은 **`updatedAt`(마지막 접수)**이다 — 서버의 정렬·검토 기준이 전부 이 값이라
 * 재요청으로 갱신된 시각이 보이는 것이 옳다(스펙 추정 8).
 *
 * 행 선택은 마우스는 행 전체 클릭, 키보드는 기관명 버튼으로 닿는다(포커스 가능한 요소가
 * 행마다 하나 — MSG-552 선례).
 */
export const RequestQueueTable = ({
  requests,
  selectedId,
  onSelect,
}: RequestQueueTableProps) => (
  <table className="w-full border-separate border-spacing-0 text-left">
    <caption className="sr-only">계정 발급 요청 목록</caption>
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
      {requests.map((request) => {
        const selected = request.id === selectedId;
        return (
          <tr
            key={request.id}
            aria-selected={selected}
            onClick={() => onSelect(request.id)}
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
                  onSelect(request.id);
                }}
                className="text-left text-fm-base font-semibold text-foreground"
              >
                {request.orgName}
              </button>
            </td>
            <td className="border-b border-border px-sm py-md text-fm-body text-foreground-body">
              {request.contactName}
            </td>
            <td className="border-b border-border px-sm py-md text-fm-body text-foreground-body">
              {request.eventName}
            </td>
            <td className="border-b border-border px-sm py-md text-fm-body text-foreground-muted">
              {formatKstReceiptTime(request.updatedAt)}
            </td>
            <td className="border-b border-border py-md pl-sm pr-md">
              <StatusChip {...accountRequestStatusView(request.status)} />
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);
