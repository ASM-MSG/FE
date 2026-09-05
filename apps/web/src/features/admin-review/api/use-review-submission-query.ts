import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getSubmission1Options } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { AdminEventSubmissionDetailResponseDto } from "@/shared/api/generated/types.gen";
import { isSubmissionNotFound } from "../model/review-decision";

/**
 * 심사 상세 화면의 신청 조회 (MSG-553 AC 12) — `GET /api/admin/event-submissions/{id}`.
 *
 * 552의 `use-submission-detail-query`(큐 미리보기 보강)와 같은 엔드포인트지만 계약이
 * 다르다: 미리보기는 실패를 "미리보기 못 띄움"으로만 다루면 되는데, 이 화면은 **미발견과
 * 그 외 실패를 갈라야 한다**(미발견은 재시도가 아니라 큐 복귀 안내 — AC 12). 552 파일은
 * 비파괴로 두는 티켓 계약이라 판정을 얹은 신규 훅으로 분리했다.
 *
 * staleTime은 전역 기본(30초)을 그대로 쓴다 — 상세의 `imageUrl`이 TTL 미상의 presigned
 * GET URL이라 길게 잡으면 만료 URL이 캐시에 눕는다(552 판단 답습).
 */
export const useReviewSubmissionQuery = (
  submissionId: number | null,
): {
  detail: AdminEventSubmissionDetailResponseDto | null;
  isPending: boolean;
  isError: boolean;
  /** 404(13430) — 재시도 대신 큐 복귀로 유도한다 */
  isNotFound: boolean;
  retry: () => void;
} => {
  const query = useQuery({
    // 미파싱 id에서도 생성 옵션 타입이 값을 요구해 0으로 채운다 (552 관례)
    ...getSubmission1Options({ path: { submissionId: submissionId ?? 0 } }),
    select: unwrapEnvelope,
    enabled: submissionId !== null,
  });

  return {
    detail: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    isNotFound: query.isError && isSubmissionNotFound(query.error),
    retry: query.refetch,
  };
};
