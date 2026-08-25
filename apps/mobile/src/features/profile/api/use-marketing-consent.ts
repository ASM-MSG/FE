import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createMarketingToggle,
  marketingConsentMutationOptions,
} from "./marketing-consent-mutation";

/**
 * 마케팅 수신 동의 토글 (기준 11~13) — 계약 전부는
 * `marketing-consent-mutation.ts`에 있고 이 훅은 `useMutation` 배선만 한다
 * (MSG-426 "옵션 팩토리 + 얇은 훅" 구조 — 테스트 가능성 확보가 목적).
 */
export const useMarketingConsent = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation(marketingConsentMutationOptions(queryClient));

  return {
    toggle: createMarketingToggle(queryClient, (consented) =>
      mutation.mutate(consented),
    ),
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
};
