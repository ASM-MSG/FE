import { useMutation, useQueryClient } from "@tanstack/react-query";
// 생성 mutation 옵션·쿼리 키는 barrel(generated/index.ts) 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  getStatusQueryKey,
  requestResetMutation,
  resetPasswordMutation,
  setInitialPasswordMutation,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { useAuthStore } from "../model/auth-store";

/**
 * 비밀번호 3종 mutation 훅 (MSG-542 AC 7·10·11) — 초기 설정 · 재설정 링크 요청 · 재설정 확정.
 *
 * `use-auth-mutations.ts`와 달리 **생성 mutation 옵션을 그대로 위임**한다: 응답 헤더
 * (X-Device-Id)가 필요 없어 SDK를 직접 호출할 이유가 없다. 응답 본문도 쓰지 않는다
 * (세 API 모두 데이터 없는 성공 응답) — 훅은 성공·실패 상태와 부수효과만 제공한다.
 *
 * 별도 파일인 이유는 병렬 티켓과의 충돌 회피다 — 기존 인증 훅 파일은 수정하지 않는다.
 */

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
// (use-auth-mutations의 선례). 변수는 평면 객체로 받아 화면이 SDK Options 계층을 모르게 한다.
const setInitialPasswordFn = setInitialPasswordMutation().mutationFn!;
const requestResetFn = requestResetMutation().mutationFn!;
const resetPasswordFn = resetPasswordMutation().mutationFn!;

/**
 * 초기 비밀번호 설정 (AC 7) — `POST /api/auth/password/initial`. 현재 비밀번호는 보내지
 * 않는다(발급받은 초기 비밀번호로 이미 로그인한 세션이 전제). 성공 시 서버의 강제 변경
 * 상태가 풀리므로 **비밀번호 상태 캐시를 즉시 갱신하고 무효화**한다 — 그러지 않으면
 * mustChange=true로 캐시된 값이 남아 착지 라우트에서 게이트가 다시 발동해
 * setup 화면으로 되돌린다(MSG-541 게이트와의 협업 지점 — 게이트 본체는 수정하지 않는다).
 */
export const useSetInitialPassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { newPassword: string }, context) =>
      setInitialPasswordFn({ body: variables }, context),
    onSuccess: async () => {
      // 재조회 왕복을 기다리는 사이 게이트가 옛 값을 읽지 않도록 낙관 갱신을 먼저 둔다
      queryClient.setQueryData(getStatusQueryKey(), (previous) =>
        previous === undefined
          ? previous
          : { ...previous, data: { mustChange: false } },
      );
      await queryClient.invalidateQueries({ queryKey: getStatusQueryKey() });
    },
  });
};

/**
 * 재설정 링크 요청 (AC 10) — `POST /api/auth/password/reset-request`, 비로그인 경로.
 * 계정 유무와 무관하게 항상 성공 응답이다(서버의 가입 여부 은닉 정책) — 화면은 성공을
 * 그대로 발송 완료로 표시한다.
 */
export const useRequestPasswordReset = () =>
  useMutation({
    mutationFn: (variables: { email: string }, context) =>
      requestResetFn({ body: variables }, context),
  });

/**
 * 재설정 확정 (AC 11) — `POST /api/auth/password/reset`, 비로그인 경로.
 * 성공 시 서버가 그 계정의 **전 기기 세션과 기발급 액세스 토큰을 즉시 무효화**하므로
 * 로컬에 남은 토큰은 죽은 값이다 — 로컬 세션을 정리한다(추정 7).
 * 로그아웃 API는 호출하지 않는다: 세션이 이미 서버에서 소멸했다.
 */
export const useConfirmPasswordReset = () => {
  const clearLocalSession = useAuthStore((s) => s.logout);
  return useMutation({
    mutationFn: (variables: { token: string; newPassword: string }, context) =>
      resetPasswordFn({ body: variables }, context),
    onSuccess: () => clearLocalSession(),
  });
};
