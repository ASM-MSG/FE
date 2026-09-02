import { useQuery } from "@tanstack/react-query";
// 게이트형 쿼리 반환 꼬리 공용 파생 — 이미 추출돼 있어 재사용한다 (MSG-328)
import { gatedQueryStatus } from "@/features/region/model/gated-query-status";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 query 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getSubmission1Options } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { AdminEventSubmissionDetailResponseDto } from "@/shared/api/generated/types.gen";

/**
 * 선택 행사 상세 조회 (MSG-554 AC 4) — `GET /api/admin/event-submissions/{submissionId}`.
 * 목록 DTO에 없는 상세 카드 재료(대표 이미지 presigned URL·위치·노출 사각형·심사 이력)를
 * 심사 상세 API에서 합성한다(스펙 추정 2 — 승인 행사 식별자 = 신청 id).
 * 행 미선택(null)이면 발사하지 않는다.
 */
export const useAdminEventDetailQuery = (
  submissionId: number | null,
): {
  detail: AdminEventSubmissionDetailResponseDto | null;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
} => {
  const query = useQuery({
    // 미선택 상태에서도 생성 옵션 타입이 값을 요구해 0으로 채운다 (use-event-detail-query 관례)
    ...getSubmission1Options({ path: { submissionId: submissionId ?? 0 } }),
    select: unwrapEnvelope,
    enabled: submissionId !== null,
  });

  // 미선택(비활성) 쿼리는 영원히 pending이라 게이트로 눌러 준다 — 빈 상태 카드가 로딩으로 보이지 않는다
  return {
    detail: query.data ?? null,
    ...gatedQueryStatus(query, submissionId !== null),
  };
};
