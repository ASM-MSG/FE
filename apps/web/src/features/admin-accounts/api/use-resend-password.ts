import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 mutation 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { resendPasswordMutation } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { OrgAccountResendResponseDto } from "@/shared/api/generated/types.gen";
import {
  type AccountFailureNotice,
  accountFailureNotice,
} from "../model/account-view";
import { invalidateAccounts } from "./invalidate-account-caches";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const resendPasswordFn = resendPasswordMutation().mutationFn!;

/**
 * 초기 비밀번호 재발송 (MSG-551 AC 10) —
 * `POST /api/admin/organizations/{userId}/resend-password` (바디 없음).
 *
 * **재발송 = 재발급**이다(서버 doc): 새 초기 비밀번호가 생성되고 이전 것은 즉시 무효다.
 * 파괴적이라 화면이 확인 단계를 한 번 거친다(스펙 추정 11). 응답은 `{ emailSent }`뿐 —
 * 비밀번호 문자열은 여기에도 없다.
 *
 * 대상은 초기 로그인 전(mustChange=true) 계정뿐이라 실패 409(1423)는 우리 목록의
 * 라벨이 스테일이라는 신호다 — 목록을 재조회해 재발송 버튼 자체를 걷는다.
 */
export const useResendPassword = (callbacks?: {
  onResent?: (result: OrgAccountResendResponseDto) => void;
  onFailed?: (notice: AccountFailureNotice) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId }: { userId: number }, context) =>
      resendPasswordFn({ path: { userId } }, context),
    // 재발송은 목록 표기(mustChange·발급 시각)를 바꾸지 않아 성공 시 무효화가 없다
    onSuccess: (response) => callbacks?.onResent?.(unwrapEnvelope(response)),
    onError: (error) => {
      const notice = accountFailureNotice(error);
      if (notice.staleServerState) invalidateAccounts(queryClient);
      callbacks?.onFailed?.(notice);
    },
  });
};
