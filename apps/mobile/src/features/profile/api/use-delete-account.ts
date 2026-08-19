import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authStore } from "../../auth/model/auth-session";
import { deleteAccountMutationOptions } from "./delete-account-mutation";

/**
 * 계정 삭제 훅 (기준 10) — 옵션 팩토리(delete-account-mutation)에 앱 세션 스토어를 물린다.
 * 콜백은 **훅 레벨 옵션**으로 받는다 — mutate per-call 콜백은 관찰자 언마운트 시 유실된다
 * (웹 MSG-325 선례). 계정 삭제는 성공 즉시 화면을 떠나므로 특히 그렇다.
 */
export const useDeleteAccount = (callbacks: { onDeleted: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation(
    deleteAccountMutationOptions({
      queryClient,
      clearSession: () => authStore.logout(),
      onDeleted: callbacks.onDeleted,
    }),
  );
};
