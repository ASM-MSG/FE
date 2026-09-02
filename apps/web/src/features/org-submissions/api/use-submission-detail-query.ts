import { useQuery } from "@tanstack/react-query";
import { gatedQueryStatus } from "@/features/region/model/gated-query-status";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getSubmissionOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { EventSubmissionDetailResponseDto } from "@/shared/api/generated/types.gen";

export interface SubmissionDetailResult {
  /** 상세 — 미조회(id null)·로딩·실패는 모두 null */
  detail: EventSubmissionDetailResponseDto | null;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * 신청 상세 조회 (MSG-545 AC 5, 추정 4) — `GET /api/org/event-submissions/{submissionId}`.
 *
 * 목록 응답에 반려 사유·이력이 없어(실측) 요약 카드가 **대표가 REJECTED일 때만** 1건을
 * 추가 조회한다. `submissionId`가 null이면 요청을 발사하지 않는다 — 비반려 대표·빈 목록에서
 * 불필요한 왕복이 생기지 않는다.
 *
 * MSG-549(신청 상세 화면)가 그대로 재사용할 자산이다.
 */
export const useSubmissionDetailQuery = (
  submissionId: number | null,
): SubmissionDetailResult => {
  const active = submissionId !== null;

  const query = useQuery({
    ...getSubmissionOptions({ path: { submissionId: submissionId ?? 0 } }),
    select: unwrapEnvelope,
    enabled: active,
  });

  return {
    detail: query.data ?? null,
    ...gatedQueryStatus(query, active),
  };
};
