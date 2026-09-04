import { cn } from "@fillmap/ui-web";
import {
  emailChangeStatusView,
  orgNameLabel,
} from "@/features/admin-accounts/model/account-view";
import type { AdminEmailChangeRequestItemResponseDto } from "@/shared/api/generated/types.gen";
import { formatKstReceiptTime } from "@/shared/format";
import { StatusChip } from "./StatusChip";

interface EmailChangeTableProps {
  requests: AdminEmailChangeRequestItemResponseDto[];
  selectedId: number | null;
  onSelect: (requestId: number) => void;
}

const COLUMNS = ["기관", "현재 아이디", "바꾸려는 이메일", "요청일", "상태"];

/**
 * 아이디 변경 요청 테이블 (MSG-551 AC 13 — Figma 부재, 발급 요청 큐 구조 답습).
 *
 * **현재 아이디와 바꾸려는 이메일을 나란히** 둔다 — 관리자가 도메인·오타를 눈으로
 * 대조하는 것이 이 큐의 검토 행위다(서버 doc 취지).
 * "요청일"은 `createdAt`이다 — 이 큐의 검토 기준 시각이자 승인·반려에 에코하는 값이라
 * 화면 표기도 그것을 따른다(스펙 추정 8).
 */
export const EmailChangeTable = ({
  requests,
  selectedId,
  onSelect,
}: EmailChangeTableProps) => (
  <table className="w-full border-separate border-spacing-0 text-left">
    <caption className="sr-only">아이디 변경 요청 목록</caption>
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
                {orgNameLabel(request.orgName)}
              </button>
            </td>
            <td className="break-all border-b border-border px-sm py-md text-fm-body text-foreground-muted">
              {request.email}
            </td>
            <td className="break-all border-b border-border px-sm py-md text-fm-body text-foreground">
              {request.requestedEmail}
            </td>
            <td className="border-b border-border px-sm py-md text-fm-body text-foreground-muted">
              {formatKstReceiptTime(request.createdAt)}
            </td>
            <td className="border-b border-border py-md pl-sm pr-md">
              <StatusChip {...emailChangeStatusView(request.status)} />
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);
