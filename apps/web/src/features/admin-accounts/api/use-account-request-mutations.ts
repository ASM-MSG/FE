import {
  type QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 mutation 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  approve1Mutation,
  reject2Mutation,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import type { OrgAccountIssueResponseDto } from "@/shared/api/generated/types.gen";
import {
  type AccountFailureNotice,
  accountFailureNotice,
} from "../model/account-view";
import {
  invalidateAccountRequestDetail,
  invalidateAccountRequests,
  invalidateAccounts,
} from "./invalidate-account-caches";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const approveFn = approve1Mutation().mutationFn!;
const rejectFn = reject2Mutation().mutationFn!;

interface ApproveInput {
  requestId: number;
  /** 상세 응답의 `updatedAt`을 그대로 — 값이 다르면 서버가 409(1426)로 거절한다 */
  updatedAt: string;
}

interface RejectInput extends ApproveInput {
  /** 저장만 되는 반려 사유 (메일 미발송) — 공백 검증은 canSubmitReason이 소유 */
  reason: string;
}

/**
 * 승인·반려 공통 실패 처리 — 서버 진실이 바뀐 실패(1421·1422·1426·1409)면 목록·상세를
 * 재조회해 스테일 카드에서 같은 확정을 반복하는 헛 루프를 막는다 (MSG-554 선례).
 *
 * **안내가 계정 목록을 가리키면 그 캐시도 무효화한다**(`CHECK_ACCOUNTS` — 1409 이메일
 * 충돌, codex 리뷰 P2): 전역 staleTime 30초 안에 운영자 계정 탭을 본 적이 있으면 탭을
 * 되돌려도 재조회가 없어 **충돌을 일으킨 그 계정이 목록에 안 보인다** — 안내가 가리키는
 * 곳이 스테일이면 안내가 거짓이 된다. 조건을 raw 코드가 아니라 `nextStep`에 걸어,
 * 앞으로 계정 목록을 가리키는 분기가 늘어도 무효화가 함께 따라간다.
 */
const handleFailure = (
  queryClient: QueryClient,
  requestId: number,
  error: unknown,
  onFailed?: (notice: AccountFailureNotice) => void,
) => {
  const notice = accountFailureNotice(error);
  if (notice.staleServerState) {
    invalidateAccountRequests(queryClient);
    invalidateAccountRequestDetail(queryClient, requestId);
  }
  if (notice.nextStep === "CHECK_ACCOUNTS") {
    invalidateAccounts(queryClient);
  }
  onFailed?.(notice);
};

/**
 * 계정 발급 요청 승인 (MSG-551 AC 6·12) —
 * `POST /api/admin/org-account-requests/{requestId}/approve`.
 *
 * 바디는 상세의 검토 기준 시각 에코 하나뿐이다 — FE가 오래된 값을 만들지 않도록
 * 상세 응답의 값을 그대로 실어 보낸다(스펙 리스크 "검토 기준 시각 에코의 사고 창").
 * 결과는 직접 발급과 동형(`{ userId, emailSent }`)이라 안내 문구도 공유한다.
 *
 * 성공하면 요청 목록(counts 포함)·그 상세·**계정 목록**을 무효화한다 — 승인은 계정을
 * 만들므로 운영자 계정 탭의 목록도 스테일이다. 실패 분기는 `handleFailure`가 소유한다.
 */
export const useApproveAccountRequest = (callbacks?: {
  onApproved?: (result: OrgAccountIssueResponseDto) => void;
  onFailed?: (notice: AccountFailureNotice) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, updatedAt }: ApproveInput, context) =>
      approveFn({ path: { requestId }, body: { updatedAt } }, context),
    onSuccess: (response, { requestId }) => {
      invalidateAccountRequests(queryClient);
      invalidateAccountRequestDetail(queryClient, requestId);
      invalidateAccounts(queryClient);
      callbacks?.onApproved?.(unwrapEnvelope(response));
    },
    onError: (error, { requestId }) =>
      handleFailure(queryClient, requestId, error, callbacks?.onFailed),
  });
};

/**
 * 계정 발급 요청 반려 (MSG-551 AC 6·12) —
 * `POST /api/admin/org-account-requests/{requestId}/reject`.
 *
 * **메일은 발송되지 않는다**(서버 doc) — 저장된 사유가 관리자의 수기 통보 재료다.
 * 계정을 만들지 않으므로 계정 목록은 무효화하지 않는다.
 */
export const useRejectAccountRequest = (callbacks?: {
  onRejected?: () => void;
  onFailed?: (notice: AccountFailureNotice) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, reason, updatedAt }: RejectInput, context) =>
      rejectFn({ path: { requestId }, body: { reason, updatedAt } }, context),
    onSuccess: (_response, { requestId }) => {
      invalidateAccountRequests(queryClient);
      invalidateAccountRequestDetail(queryClient, requestId);
      callbacks?.onRejected?.();
    },
    onError: (error, { requestId }) =>
      handleFailure(queryClient, requestId, error, callbacks?.onFailed),
  });
};
