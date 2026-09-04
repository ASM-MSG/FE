import { useQuery } from "@tanstack/react-query";
// 게이트형 쿼리 반환 꼬리 공용 파생 — 이미 추출돼 있어 재사용한다 (MSG-328)
import { gatedQueryStatus } from "@/features/region/model/gated-query-status";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 query 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getRequestOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { AdminOrgAccountRequestDetailResponseDto } from "@/shared/api/generated/types.gen";

/**
 * 선택한 발급 요청 상세 조회 (MSG-551 AC 5) —
 * `GET /api/admin/org-account-requests/{requestId}`.
 *
 * 목록 DTO에 없는 카드 재료(연락처·요청 내용·반려 사유·처리 시각)와 **승인·반려에
 * 에코할 검토 기준 시각(`updatedAt`)**이 여기서만 온다. 행 미선택(null)이면 발사하지
 * 않는다 (MSG-552 선례).
 */
export const useAccountRequestDetailQuery = (
  requestId: number | null,
): {
  detail: AdminOrgAccountRequestDetailResponseDto | null;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
} => {
  const query = useQuery({
    // 미선택 상태에서도 생성 옵션 타입이 값을 요구해 0으로 채운다 (use-admin-event-detail-query 관례)
    ...getRequestOptions({ path: { requestId: requestId ?? 0 } }),
    select: unwrapEnvelope,
    enabled: requestId !== null,
  });

  // 미선택(비활성) 쿼리는 영원히 pending이라 게이트로 눌러 준다 — 빈 상태 카드가 로딩으로 보이지 않는다
  return {
    detail: query.data ?? null,
    ...gatedQueryStatus(query, requestId !== null),
  };
};
