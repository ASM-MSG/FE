import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 query 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getEmailChangeRequestsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { AdminEmailChangeRequestItemResponseDto } from "@/shared/api/generated/types.gen";
import type {
  EmailChangeCounts,
  EmailChangeStatus,
} from "../model/account-view";
import { ADMIN_ACCOUNTS_PAGE_SIZE } from "./use-accounts-query";

/**
 * 아이디(이메일) 변경 요청 큐 조회 (MSG-551 AC 7) —
 * `GET /api/admin/email-change-requests`.
 *
 * **상세 API가 없다** — 목록 항목이 상세 전체이고, 승인·반려에 에코하는 검토 기준 시각도
 * 항목의 `createdAt`이다(재요청이 같은 대기 행을 덮어쓴다 — 서버 doc).
 * pill 전환 시 뱃지 유지·직전 행 차단은 발급 요청 큐와 같은 정책이다.
 */
export const useEmailChangeRequestsQuery = (
  status: EmailChangeStatus,
): {
  requests: AdminEmailChangeRequestItemResponseDto[];
  counts: EmailChangeCounts | null;
  /** 현재 필터의 서버 전체 건수 — 1페이지 초과분 고지 재료 (codex P2) */
  totalElements: number | undefined;
  isPending: boolean;
  isPlaceholder: boolean;
  isError: boolean;
  retry: () => void;
} => {
  const query = useQuery({
    ...getEmailChangeRequestsOptions({
      query: { status, page: 0, size: ADMIN_ACCOUNTS_PAGE_SIZE },
    }),
    select: unwrapEnvelope,
    placeholderData: keepPreviousData,
  });

  return {
    requests: query.data?.requests ?? [],
    counts:
      query.data === undefined
        ? null
        : {
            pendingCount: query.data.pendingCount,
            approvedCount: query.data.approvedCount,
            rejectedCount: query.data.rejectedCount,
          },
    totalElements: query.data?.totalElements,
    isPending: query.isPending,
    isPlaceholder: query.isPlaceholderData,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
};
