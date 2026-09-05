import { useMutation, useQueryClient } from "@tanstack/react-query";
// 생성 mutation 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { reject3Mutation } from "@/shared/api/generated/@tanstack/react-query.gen";
import type {
  DecisionErrorView,
  RejectReasonCode,
} from "../model/review-decision";
import {
  handleDecisionError,
  invalidateReviewCaches,
} from "./invalidate-review-caches";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const rejectFn = reject3Mutation().mutationFn!;

export interface RejectSubmissionInput {
  submissionId: number;
  /** 체크된 항목 코드 — 1개 이상·중복 불가 게이트는 `canSubmitReject`가 소유한다 */
  reasonCodes: RejectReasonCode[];
  /** 반려 사유 본문 — 운영자가 콘솔 상세에서 읽는다(메일 미발송) */
  reasonText: string;
}

/**
 * 신청 반려 (MSG-553 AC 4·9·10·11) — `POST /api/admin/event-submissions/{id}/reject`.
 * 본문은 `{reasonCodes, reasonText}`이고 응답 data는 없다(생성 타입 `200: unknown`).
 *
 * 서버가 코드 위반을 400(13454)으로 막지만 FE는 정적 4종 + 1개 이상 게이트라 그 분기를
 * 따로 만들지 않는다 — 발생 경로가 없는 안내는 두지 않는다.
 * 무효화·콜백 계약은 `use-approve-submission`과 같다.
 */
export const useRejectSubmission = (callbacks?: {
  onRejected?: () => void;
  onFailed?: (notice: DecisionErrorView) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      { submissionId, reasonCodes, reasonText }: RejectSubmissionInput,
      context,
    ) =>
      rejectFn(
        { path: { submissionId }, body: { reasonCodes, reasonText } },
        context,
      ),
    onSuccess: (_response, { submissionId }) => {
      invalidateReviewCaches(queryClient, submissionId);
      callbacks?.onRejected?.();
    },
    onError: handleDecisionError(queryClient, callbacks?.onFailed),
  });
};
