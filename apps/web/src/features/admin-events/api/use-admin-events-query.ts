import { useQuery } from "@tanstack/react-query";
// 쿼리 반환 꼬리 공용 파생 — 이미 추출돼 있어 재사용한다 (MSG-328)
import { gatedQueryStatus } from "@/features/region/model/gated-query-status";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 query 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getEventsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { AdminApprovedEventListResponseDto } from "@/shared/api/generated/types.gen";
import type { ApprovedEventStatus } from "../model/approved-event";

/**
 * 한 페이지 크기 — 서버 상한(1~100). 티켓·Figma에 페이지네이션이 없고 MVP 행사 수가
 * 상한 미만이라 1페이지만 조회한다(스펙 추정 7). 초과분 미표시는 기록된 리스크다.
 */
export const ADMIN_EVENTS_PAGE_SIZE = 100;

/**
 * 승인 행사 목록 조회 (MSG-554 AC 1·2) — `GET /api/admin/events`.
 * 탭 status가 queryKey에 실려 탭 전환이 곧 재조회다. 카운트 3종은 탭과 무관한 전체
 * 집계라 같은 응답에서 함께 온다 — 별도 쿼리를 두지 않는다.
 * 진입 가드(RequireAdminRole)가 ADMIN만 통과시키므로 인증 게이트는 두지 않는다.
 */
export const useAdminEventsQuery = (
  status: ApprovedEventStatus,
): {
  data: AdminApprovedEventListResponseDto | null;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
} => {
  const query = useQuery({
    ...getEventsOptions({ query: { status, size: ADMIN_EVENTS_PAGE_SIZE } }),
    select: unwrapEnvelope,
  });

  // 진입 즉시 발사하는 쿼리라 게이트는 항상 활성이다
  return { data: query.data ?? null, ...gatedQueryStatus(query, true) };
};
