import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 mutation 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { approve2Mutation } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { EventSubmissionApproveResponseDto } from "@/shared/api/generated/types.gen";
import type { DecisionErrorView } from "../model/review-decision";
import {
  handleDecisionError,
  invalidateReviewCaches,
} from "./invalidate-review-caches";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const approveFn = approve2Mutation().mutationFn!;

/**
 * 신청 승인 (MSG-553 AC 4·10·11) — `POST /api/admin/event-submissions/{id}/approve`.
 *
 * **요청 본문이 없다**(생성 타입 `Approve2Data.body?: never`) — 승인 입력은 전부 저장된
 * 신청에서 나온다. 그래서 MSG-551의 낙관 잠금(requestedAt 에코) 같은 재료가 아예 없고,
 * 동시 승인 경합은 서버 409(13450)가 흡수한다(늦은 쪽이 실패).
 *
 * 성공하면 심사 큐 목록과 이 신청 상세를 무효화해 처리된 신청이 심사 중 목록에서 빠진다.
 * 큐 복귀 분기(13450·13430)는 서버 진실이 이미 바뀐 신호라 실패에서도 같은 무효화를
 * 건다 — 스테일 목록으로 돌아가 같은 조작을 반복하는 헛 루프를 막는다
 * (`use-unpublish-event` codex 리뷰 P2 선례).
 *
 * 콜백은 훅 레벨 옵션으로 받는다 — mutate per-call 콜백은 관찰자 언마운트 시 유실된다
 * (MSG-325 선례).
 */
export const useApproveSubmission = (callbacks?: {
  onApproved?: (result: EventSubmissionApproveResponseDto) => void;
  onFailed?: (notice: DecisionErrorView) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ submissionId }: { submissionId: number }, context) =>
      approveFn({ path: { submissionId } }, context),
    onSuccess: (response, { submissionId }) => {
      invalidateReviewCaches(queryClient, submissionId);
      callbacks?.onApproved?.(unwrapEnvelope(response));
    },
    onError: handleDecisionError(queryClient, callbacks?.onFailed),
  });
};
