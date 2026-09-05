import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 mutation 옵션·키는 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  getMySubmissionsQueryKey,
  getSubmissionQueryKey,
  resubmitMutation,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import type {
  EventSubmissionSubmitResponseDto,
  EventSubmissionUpdateRequestDto,
} from "@/shared/api/generated/types.gen";

// 생성 팩토리는 mutationFn을 항상 채운다 — 타입만 optional이라 !로 좁힌다 (기존 관례)
const resubmitFn = resubmitMutation().mutationFn!;

/** 재제출은 대상 신청 경로까지 필요하다 — 생성(POST)과 달리 body만으로 발사되지 않는다 */
export interface ResubmitVariables {
  submissionId: number;
  body: EventSubmissionUpdateRequestDto;
}

/**
 * 반려본 수정 재제출 (MSG-550 AC 5·6·7) — `PATCH /api/org/event-submissions/{submissionId}`.
 *
 * **수정 모드 전용**이다 — 신규 제출(POST `submit`)은 `use-submit-submission`이 소유한다.
 * 두 계약은 본문 타입·경로 인자·무효화 범위가 달라 한 훅에 mode 분기로 합치지 않는다.
 *
 * 성공 시 캐시 2개를 무효화한다: 내 신청 목록(`getMySubmissions` — 목록 화면과 홈 카운트·
 * 대표 카드가 이 쿼리 하나를 공유한다)과 **그 신청의 상세**(`getSubmission` — 홈 반려 요약
 * 카드와 상세 화면이 공유). 둘이면 티켓의 "목록·상세·홈 카운트 갱신"이 전부 덮인다.
 * 실패는 캐시를 건드리지 않고 그대로 올려 보낸다(모달 유지·재시도 — 안내 문구는
 * `submitFailureNotice`가 소유). navigate·스토어 리셋은 뷰 레이어 몫이다(플랫폼 격리).
 */
export const useResubmitSubmission = (callbacks?: {
  onResubmitted?: (receipt: EventSubmissionSubmitResponseDto) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    // 생성 mutationFn은 (variables, context) 2인자 — context를 그대로 위임 전달한다
    mutationFn: async ({ submissionId, body }: ResubmitVariables, context) =>
      unwrapEnvelope(
        await resubmitFn({ body, path: { submissionId } }, context),
      ),
    onSuccess: (receipt, { submissionId }) => {
      void queryClient.invalidateQueries({
        queryKey: getMySubmissionsQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getSubmissionQueryKey({ path: { submissionId } }),
      });
      callbacks?.onResubmitted?.(receipt);
    },
  });
};
