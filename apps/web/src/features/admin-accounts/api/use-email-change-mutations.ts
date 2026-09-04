import {
  type QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 mutation 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  approveEmailChangeMutation,
  rejectEmailChangeMutation,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import type { EmailChangeApproveResponseDto } from "@/shared/api/generated/types.gen";
import {
  type AccountFailureNotice,
  accountFailureNotice,
} from "../model/account-view";
import {
  invalidateAccounts,
  invalidateEmailChangeRequests,
} from "./invalidate-account-caches";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const approveFn = approveEmailChangeMutation().mutationFn!;
const rejectFn = rejectEmailChangeMutation().mutationFn!;

interface ApproveInput {
  requestId: number;
  /** 목록 항목의 `createdAt`을 그대로 — 값이 다르면 서버가 409(1429)로 거절한다 */
  requestedAt: string;
}

interface RejectInput extends ApproveInput {
  /** 저장만 되는 반려 사유 (메일 미발송) — 공백 검증은 canSubmitReason이 소유 */
  reason: string;
}

/**
 * 승인·반려 공통 실패 처리 — 서버 진실이 바뀐 실패(1427·1428·1429·1409)면 목록을
 * 재조회해 스테일 행에서 같은 확정을 반복하는 헛 루프를 막는다 (MSG-554 선례).
 *
 * **안내가 계정 목록을 가리키면 그 캐시도 무효화한다**(`CHECK_ACCOUNTS` — 1409 이메일
 * 충돌, codex 리뷰 P2): 전역 staleTime 30초 안에 운영자 계정 탭을 본 적이 있으면 탭을
 * 되돌려도 재조회가 없어 충돌을 일으킨 계정이 목록에서 빠진 채로 보인다.
 */
const handleFailure = (
  queryClient: QueryClient,
  error: unknown,
  onFailed?: (notice: AccountFailureNotice) => void,
) => {
  const notice = accountFailureNotice(error);
  if (notice.staleServerState) invalidateEmailChangeRequests(queryClient);
  if (notice.nextStep === "CHECK_ACCOUNTS") invalidateAccounts(queryClient);
  onFailed?.(notice);
};

/**
 * 아이디 변경 승인 (MSG-551 AC 7·13) —
 * `POST /api/admin/email-change-requests/{requestId}/approve`.
 *
 * 로그인 아이디가 교체되고 새 이메일로 변경 통지가 나간다 — 통지 실패(emailSent=false)
 * 여도 교체는 유지된다(서버 doc). 계정의 email이 바뀌므로 **계정 목록**도 무효화한다.
 */
export const useApproveEmailChange = (callbacks?: {
  onApproved?: (result: EmailChangeApproveResponseDto) => void;
  onFailed?: (notice: AccountFailureNotice) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, requestedAt }: ApproveInput, context) =>
      approveFn({ path: { requestId }, body: { requestedAt } }, context),
    onSuccess: (response) => {
      invalidateEmailChangeRequests(queryClient);
      invalidateAccounts(queryClient);
      callbacks?.onApproved?.(unwrapEnvelope(response));
    },
    onError: (error) => handleFailure(queryClient, error, callbacks?.onFailed),
  });
};

/**
 * 아이디 변경 반려 (MSG-551 AC 7·13) —
 * `POST /api/admin/email-change-requests/{requestId}/reject`.
 *
 * **메일 미발송**(서버 doc) — 저장된 사유가 수기 통보 재료다. 아이디가 그대로라
 * 계정 목록은 무효화하지 않는다.
 */
export const useRejectEmailChange = (callbacks?: {
  onRejected?: () => void;
  onFailed?: (notice: AccountFailureNotice) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, reason, requestedAt }: RejectInput, context) =>
      rejectFn({ path: { requestId }, body: { reason, requestedAt } }, context),
    onSuccess: () => {
      invalidateEmailChangeRequests(queryClient);
      callbacks?.onRejected?.();
    },
    onError: (error) => handleFailure(queryClient, error, callbacks?.onFailed),
  });
};
