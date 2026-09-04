import type { QueryClient } from "@tanstack/react-query";
// 생성 키는 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  getAccountsQueryKey,
  getEmailChangeRequestsQueryKey,
  getRequestQueryKey,
  getRequestsQueryKey,
} from "@/shared/api/generated/@tanstack/react-query.gen";

/**
 * 계정 운영 캐시 무효화 (MSG-551 AC 4·6·7·10) — 뮤테이션 5종이 같은 세 캐시 집합을
 * 서로 다른 조합으로 무효화해 한 자리에 모았다.
 *
 * 목록은 생성 키의 식별자(`_id`)만 남긴 **부분 키**로 잡는다 — 필터 status·page·size가
 * 키에 실려 있어 정확 키로는 다른 필터의 캐시가 스테일로 남는다
 * (use-unpublish-event 관례).
 */

/** 발급된 계정 목록 — 발급·승인·재발송·아이디 변경 승인이 건드린다 */
export const invalidateAccounts = (queryClient: QueryClient) => {
  const [key] = getAccountsQueryKey();
  void queryClient.invalidateQueries({ queryKey: [{ _id: key._id }] });
};

/** 발급 요청 목록(counts 포함) — 필터 3종 전부 */
export const invalidateAccountRequests = (queryClient: QueryClient) => {
  const [key] = getRequestsQueryKey();
  void queryClient.invalidateQueries({ queryKey: [{ _id: key._id }] });
};

/** 선택한 발급 요청 상세 — 승인·반려로 status·processedAt이 바뀐다 */
export const invalidateAccountRequestDetail = (
  queryClient: QueryClient,
  requestId: number,
) => {
  void queryClient.invalidateQueries({
    queryKey: getRequestQueryKey({ path: { requestId } }),
  });
};

/** 아이디 변경 요청 목록(counts 포함) — 필터 3종 전부 */
export const invalidateEmailChangeRequests = (queryClient: QueryClient) => {
  const [key] = getEmailChangeRequestsQueryKey();
  void queryClient.invalidateQueries({ queryKey: [{ _id: key._id }] });
};
