import type { QueryClient } from "@tanstack/react-query";
// 생성 mutation 옵션·키는 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  getSubmission1QueryKey,
  getSubmissionsQueryKey,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import {
  decisionFailureOf,
  type DecisionErrorView,
} from "../model/review-decision";

/**
 * 심사 확정 후 캐시 무효화 (MSG-553 AC 10) — 승인·반려 두 훅이 같은 두 쿼리를 되돌린다.
 *
 * 목록은 생성 키의 식별자(`_id`)만 남긴 **부분 키**로 잡는다: 탭별 status·page·size가
 * 키에 실려 있어 정확 키로는 다른 탭 캐시와 카운트가 스테일로 남는다
 * (`use-unpublish-event`·`invalidate-account-caches` 관례).
 */
export const invalidateReviewCaches = (
  queryClient: QueryClient,
  submissionId: number,
): void => {
  const [listKey] = getSubmissionsQueryKey();
  void queryClient.invalidateQueries({ queryKey: [{ _id: listKey._id }] });
  void queryClient.invalidateQueries({
    queryKey: getSubmission1QueryKey({ path: { submissionId } }),
  });
};

/**
 * 확정 실패 처리 (AC 11) — 승인·반려가 완전히 같아 한 자리에 둔다(nose 신규 중복 해소).
 *
 * 큐 복귀 분기(13450 이미 처리 · 13430 대상 소멸)는 서버 진실이 이미 바뀐 신호라
 * **실패에서도 성공과 같은 무효화를 건다** — 스테일 목록으로 돌아가 같은 조작을
 * 반복하는 헛 루프를 막는다(`use-unpublish-event` codex 리뷰 P2 선례).
 * 그 외 실패는 캐시를 건드리지 않고 안내만 올려 보낸다(화면 유지·재시도).
 */
export const handleDecisionError =
  (
    queryClient: QueryClient,
    onFailed: ((notice: DecisionErrorView) => void) | undefined,
  ) =>
  (error: unknown, { submissionId }: { submissionId: number }): void => {
    const notice = decisionFailureOf(error);
    if (notice.nextStep === "backToQueue") {
      invalidateReviewCaches(queryClient, submissionId);
    }
    onFailed?.(notice);
  };
