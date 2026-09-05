import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getSubmission1Options } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { AdminEventSubmissionDetailResponseDto } from "@/shared/api/generated/types.gen";

/**
 * 선택 신청 상세 보강 조회 (MSG-552 AC 4) — `GET /api/admin/event-submissions/{submissionId}`.
 * 미리보기 카드의 대표 이미지·사각형 수·칸 수는 목록 응답에 없어 상세 조회가 필연이다
 * (추정 1). 행이 선택되지 않았으면 발사하지 않는다.
 *
 * staleTime은 전역 기본(30초 — MSG-323)을 그대로 쓴다: `imageUrl`이 TTL 미상의
 * 열람용 presigned GET URL이라 캐시를 길게 잡으면 만료된 URL로 이미지가 깨진다.
 * 30초 뒤 재선택은 새 URL을 받고, 그 사이 만료는 `<img>` onError 자리표시가 받는다
 * (스펙 리스크 "presigned 이미지 URL 만료"의 이중 방어).
 */
export const useSubmissionDetailQuery = (
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

  return {
    detail: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    retry: query.refetch,
  };
};
