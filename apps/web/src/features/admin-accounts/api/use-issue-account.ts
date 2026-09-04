import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 mutation 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { issueDirectMutation } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { OrgAccountIssueResponseDto } from "@/shared/api/generated/types.gen";
import {
  type AccountFailureNotice,
  accountFailureNotice,
  type IssueFormValues,
} from "../model/account-view";
import { invalidateAccounts } from "./invalidate-account-caches";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const issueDirectFn = issueDirectMutation().mutationFn!;

/**
 * 운영자 계정 직접 발급 (MSG-551 AC 4·9) — `POST /api/admin/organizations`.
 *
 * 폼 필수 3필드만 보낸다 — `contactPhone`은 폼에 없어 미전송이다(스펙 추정 5).
 * **응답에 초기 비밀번호는 없다**(서버 재료): `{ userId, emailSent }`뿐이라 화면이
 * 비밀번호를 렌더할 재료 자체가 없다 (AC 8).
 *
 * 성공하면 계정 목록을 무효화해 새 계정이 목록 상단에 나타난다. 1409(이미 계정 있는
 * 이메일)도 서버 진실이 우리 목록과 다르다는 신호라 같은 무효화를 건다 — 관리자가
 * 목록에서 발급 여부를 확인하는 것이 다음 조작이다.
 * 콜백은 훅 레벨 옵션으로 받는다 — mutate per-call 콜백은 관찰자 언마운트 시 유실된다
 * (MSG-325 선례).
 */
export const useIssueAccount = (callbacks?: {
  onIssued?: (result: OrgAccountIssueResponseDto) => void;
  onFailed?: (notice: AccountFailureNotice) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgName, contactName, email }: IssueFormValues, context) =>
      issueDirectFn({ body: { orgName, contactName, email } }, context),
    onSuccess: (response) => {
      invalidateAccounts(queryClient);
      callbacks?.onIssued?.(unwrapEnvelope(response));
    },
    onError: (error) => {
      const notice = accountFailureNotice(error);
      if (notice.staleServerState) invalidateAccounts(queryClient);
      callbacks?.onFailed?.(notice);
    },
  });
};
