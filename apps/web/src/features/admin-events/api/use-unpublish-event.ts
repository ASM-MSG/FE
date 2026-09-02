import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 mutation 옵션·키는 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  getEventsQueryKey,
  getSubmission1QueryKey,
  unpublishMutation,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import type { AdminEventUnpublishResponseDto } from "@/shared/api/generated/types.gen";
import {
  type UnpublishFailureNotice,
  unpublishFailureNotice,
} from "../model/approved-event";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const unpublishFn = unpublishMutation().mutationFn!;

export interface UnpublishEventInput {
  submissionId: number;
  /** 운영자에게 그대로 발송되는 사유 — 공백 검증은 canSubmitUnpublish가 소유 */
  reason: string;
}

/**
 * 행사 노출 중지 (MSG-554 AC 8·9·10) — `POST /api/admin/events/{submissionId}/unpublish`.
 *
 * 성공 시 목록 쿼리 전 파라미터(탭 3종)와 그 행사의 상세를 무효화해 행·카드가 중지 상태로
 * 갱신된다. 목록은 생성 키의 식별자(`_id`)만 남긴 부분 키로 잡는다 —
 * 탭별 status·size가 키에 실려 있어 정확 키로는 다른 탭 캐시가 남는다
 * (use-event-video-mutations 관례).
 *
 * 일반 실패는 캐시를 건드리지 않고 안내만 올려 보낸다(모달 유지·재시도).
 * 단 **스테일 서버 상태(409/13453 이미 중지 · 404/13430 대상 소멸)는 성공과 같은 무효화를 건다** —
 * 스테일 행이 남아 같은 요청을 반복하는 헛 루프를 막는다 (codex 리뷰 P2).
 * 콜백은 훅 레벨 옵션으로 받는다 — mutate per-call 콜백은 관찰자 언마운트 시 유실된다
 * (MSG-325 선례).
 */
export const useUnpublishEvent = (callbacks?: {
  onUnpublished?: (result: AdminEventUnpublishResponseDto) => void;
  onFailed?: (notice: UnpublishFailureNotice) => void;
}) => {
  const queryClient = useQueryClient();

  const invalidateEventCaches = (submissionId: number) => {
    const [listKey] = getEventsQueryKey();
    void queryClient.invalidateQueries({ queryKey: [{ _id: listKey._id }] });
    void queryClient.invalidateQueries({
      queryKey: getSubmission1QueryKey({ path: { submissionId } }),
    });
  };

  return useMutation({
    mutationFn: ({ submissionId, reason }: UnpublishEventInput, context) =>
      unpublishFn({ path: { submissionId }, body: { reason } }, context),
    onSuccess: (response, { submissionId }) => {
      invalidateEventCaches(submissionId);
      callbacks?.onUnpublished?.(unwrapEnvelope(response));
    },
    onError: (error, { submissionId }) => {
      const notice = unpublishFailureNotice(error);
      if (notice.staleServerState) invalidateEventCaches(submissionId);
      callbacks?.onFailed?.(notice);
    },
  });
};
