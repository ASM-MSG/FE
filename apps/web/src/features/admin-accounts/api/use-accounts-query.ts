import { useQuery } from "@tanstack/react-query";
// 쿼리 반환 꼬리 공용 파생 — 이미 추출돼 있어 재사용한다 (MSG-328)
import { gatedQueryStatus } from "@/features/region/model/gated-query-status";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 query 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getAccountsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { AdminOrgAccountItemResponseDto } from "@/shared/api/generated/types.gen";

/**
 * 한 페이지 크기 — 서버 상한(1~100). 티켓·Figma에 페이지네이션이 없고 MVP 계정 수가
 * 상한 미만이라 1페이지만 조회한다(스펙 추정 6). 초과분 미표시는 기록된 리스크다.
 */
export const ADMIN_ACCOUNTS_PAGE_SIZE = 100;

/**
 * 발급된 운영자 계정 목록 조회 (MSG-551 AC 3) — `GET /api/admin/organizations`.
 * 정렬은 서버 고정(발급 최신순)이라 FE 재정렬이 없다. 이메일 완전 일치 검색(`email`)은
 * 화면에 검색 UI가 없어 보내지 않는다(스펙 추정 10).
 * 진입 가드(RequireAdminRole)가 ADMIN만 통과시키므로 인증 게이트는 두지 않는다.
 */
export const useAccountsQuery = (): {
  accounts: AdminOrgAccountItemResponseDto[];
  /** 서버 전체 건수 — 1페이지 초과분 고지 재료 (codex P2) */
  totalElements: number | undefined;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
} => {
  const query = useQuery({
    ...getAccountsOptions({
      query: { page: 0, size: ADMIN_ACCOUNTS_PAGE_SIZE },
    }),
    select: unwrapEnvelope,
  });

  // 탭 진입 즉시 발사하는 쿼리라 게이트는 항상 활성이다
  return {
    accounts: query.data?.accounts ?? [],
    totalElements: query.data?.totalElements,
    ...gatedQueryStatus(query, true),
  };
};
