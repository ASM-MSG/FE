import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMeQueryKey,
  updateLocationConsentMutation,
} from "../../../shared/api/query-options";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
// (웹 use-profile-mutations 선례)
const updateLocationConsentFn = updateLocationConsentMutation().mutationFn!;

/**
 * 위치기반서비스 동의 저장 (AC 18) — `PUT /api/users/me/location-consent {consented:true}`.
 * 회원가입 CTA가 발사하는 유일한 요청이다 — 만14세·이용약관·개인정보·마케팅은 요청을
 * 만들지 않는다 (AC 21).
 *
 * [MSG-448] 원문의 "저장 가능한 동의는 이 1건뿐"은 더 이상 사실이 아니다 — MSG-451 SDK
 * 재생성으로 `submitConsents`(5항목 일괄)·`updateMarketingConsent`가 생겼다. 가입 경로
 * 배선은 MSG-448 범위 밖(승인 Q7)이라 동작은 그대로 두고 사실만 정정한다.
 * 이 동의는 **철회할 수 없다** — `consented:false`는 developCode 1400으로 거절된다.
 *
 * 성공 시 getMe invalidate — 캐시 갱신 경유로 게이트(useConsentGate)가 스스로 풀린다.
 * 별도 화면 이동을 하지 않는 이유가 이것이다(승인 추정 9 — 웹 MSG-407과 동형).
 * 실패 시 게이트가 유지되고 CTA 재탭으로 재시도할 수 있다 (AC 20).
 */
export const useUpdateLocationConsent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (consented: boolean, context) =>
      updateLocationConsentFn({ body: { consented } }, context),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: getMeQueryKey() });
    },
  });
};
