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
 * 실패는 캐시를 건드리지 않고 분기 안내(`unpublishFailureNotice`)만 올려 보낸다 —
 * 모달이 유지된 채 재시도하거나(일반 실패) 목록 재조회를 유도한다(409/13453).
 * 콜백은 훅 레벨 옵션으로 받는다 — mutate per-call 콜백은 관찰자 언마운트 시 유실된다
 * (MSG-325 선례).
 */
export const useUnpublishEvent = (callbacks?: {
  onUnpublished?: (result: AdminEventUnpublishResponseDto) => void;
  onFailed?: (notice: UnpublishFailureNotice) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ submissionId, reason }: UnpublishEventInput, context) =>
      unpublishFn({ path: { submissionId }, body: { reason } }, context),
    onSuccess: (response, { submissionId }) => {
      const [listKey] = getEventsQueryKey();
      void queryClient.invalidateQueries({ queryKey: [{ _id: listKey._id }] });
      void queryClient.invalidateQueries({
        queryKey: getSubmission1QueryKey({ path: { submissionId } }),
      });
      callbacks?.onUnpublished?.(unwrapEnvelope(response));
    },
    onError: (error) => callbacks?.onFailed?.(unpublishFailureNotice(error)),
  });
};
