import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMeQueryKey,
  submitConsentsMutation,
  updateLocationConsentMutation,
} from "../../../shared/api/query-options";
import {
  toConsentSubmitBody,
  type ConsentState,
} from "../model/signup-consent";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const submitConsentsFn = submitConsentsMutation().mutationFn!;
const updateLocationConsentFn = updateLocationConsentMutation().mutationFn!;

/**
 * 회원가입 동의 저장 (MSG-606 M6) — 두 요청을 한 뮤테이션으로 묶는다.
 * ① `PUT /api/users/me/consents` — 만14세·이용약관·개인정보·위치·마케팅 5종 일괄 기록(처리방침의
 *    "동의 이력 보관"이 사실이 되게 한다) ② `PUT /api/users/me/location-consent {consented:true}` —
 *    게이트(`useConsentGate`)가 읽는 컬럼. ①이 실패하면 ②를 보내지 않아 "이력 없이 게이트만 열린"
 *    상태를 만들지 않는다. 성공 시 getMe invalidate로 게이트가 스스로 닫힌다(MSG-422 D 유지).
 */
export const useSubmitSignupConsents = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (state: ConsentState, context) => {
      await submitConsentsFn({ body: toConsentSubmitBody(state) }, context);
      return updateLocationConsentFn({ body: { consented: true } }, context);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getMeQueryKey() });
    },
  });
};
