import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 query 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getRequestsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { AdminOrgAccountRequestItemResponseDto } from "@/shared/api/generated/types.gen";
import type {
  AccountRequestCounts,
  AccountRequestStatus,
} from "../model/account-view";
import { ADMIN_ACCOUNTS_PAGE_SIZE } from "./use-accounts-query";

/**
 * 계정 발급 요청 큐 조회 (MSG-551 AC 5) — `GET /api/admin/org-account-requests`.
 * status가 쿼리 키에 실려 pill을 바꾸면 재조회된다. 정렬은 서버 고정(마지막 접수
 * 최신순)이라 FE 재정렬이 없다.
 *
 * `counts` 3종은 필터와 무관한 전체 집계다. pill을 바꿀 때마다 뱃지 숫자가 사라지지
 * 않도록 `keepPreviousData`를 쓰고, 대신 직전 목록이 새 필터의 행으로 보이지 않게
 * `isPlaceholder`를 함께 노출한다 (MSG-552 선례).
 */
export const useAccountRequestsQuery = (
  status: AccountRequestStatus,
): {
  requests: AdminOrgAccountRequestItemResponseDto[];
  counts: AccountRequestCounts | null;
  /** 현재 필터의 서버 전체 건수 — 1페이지 초과분 고지 재료 (codex P2) */
  totalElements: number | undefined;
  isPending: boolean;
  isPlaceholder: boolean;
  isError: boolean;
  retry: () => void;
} => {
  const query = useQuery({
    ...getRequestsOptions({
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
            issuedCount: query.data.issuedCount,
            rejectedCount: query.data.rejectedCount,
          },
    totalElements: query.data?.totalElements,
    isPending: query.isPending,
    isPlaceholder: query.isPlaceholderData,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
};
