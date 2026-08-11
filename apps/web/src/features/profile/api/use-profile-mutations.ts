import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/model/auth-store";
// 생성 mutation 옵션·키는 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  deleteMeMutation,
  getMeQueryKey,
  updateNicknameMutation,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { deviceIdStorage } from "@/shared/storage";

/**
 * 프로필 mutation 훅 (MSG-329 A8·A9·A11) — use-auth-mutations 패턴 미러
 * (생성 SDK mutation 옵션 기반, 직접 fetch/URL 하드코딩 없음).
 * 콜백은 훅 레벨 옵션으로 받는다 — mutate per-call 콜백은 관찰자 언마운트 시 유실된다(MSG-325 선례).
 */

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const updateNicknameFn = updateNicknameMutation().mutationFn!;
const deleteMeFn = deleteMeMutation().mutationFn!;

/**
 * 닉네임 수정 (A8·A9) — `PUT /api/users/me/nickname`.
 * 성공 시 getMe 쿼리 invalidate로 헤더 닉네임이 즉시 갱신되고 onSaved(모달 닫기)가 불린다.
 * 실패 시 onSaved가 불리지 않아 모달이 유지되고 오류 표시·재시도가 가능하다.
 */
export const useUpdateNickname = (callbacks?: { onSaved?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nickname: string, context) =>
      updateNicknameFn({ body: { nickname } }, context),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getMeQueryKey() });
      callbacks?.onSaved?.();
    },
  });
};

/**
 * 계정 삭제 (A11) — `DELETE /api/users/me`.
 * 성공 시 로컬 토큰(authStore)·디바이스 ID(스펙 추정 6 확정 — 비가역 삭제의 로컬 흔적 정리)·
 * 쿼리 캐시를 비우고 onDeleted(홈 이동)를 부른다. 실패 시 세션 유지 — 모달에 오류가 남는다.
 */
export const useDeleteAccount = (callbacks?: { onDeleted?: () => void }) => {
  const clearLocalSession = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  return useMutation({
    // 명세가 Authorization을 명시 헤더 파라미터로 선언해 생성 타입이 요구한다 —
    // 실값은 httpClient 인증 파이프라인(beforeRequest)이 Bearer 토큰으로 덮어쓴다
    mutationFn: (_variables: void, context) =>
      deleteMeFn({ headers: { Authorization: "" } }, context),
    onSuccess: () => {
      clearLocalSession();
      deviceIdStorage.clear();
      queryClient.clear();
      callbacks?.onDeleted?.();
    },
  });
};
