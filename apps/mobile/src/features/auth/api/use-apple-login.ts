import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authStore } from "../model/auth-session";
import { requestAppleCredential } from "./apple-adapter";
import { oidcLoginMutationOptions } from "./oidc-login-mutation";

/**
 * 애플 로그인 훅 (MSG-601) — use-kakao-login 미러. 옵션 팩토리(oidc-login-mutation)에 앱 세션
 * 스토어와 애플 어댑터를 물린다. 이동 콜백은 훅 레벨 옵션(use-kakao-login 주석 참조).
 */
export const useAppleLogin = (callbacks: { onLoggedIn: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation(
    oidcLoginMutationOptions({
      provider: "apple",
      queryClient,
      requestCredential: requestAppleCredential,
      setTokens: (tokens) => authStore.setTokens(tokens),
      setDeviceId: (deviceId) => authStore.setDeviceId(deviceId),
      onLoggedIn: callbacks.onLoggedIn,
    }),
  );
};
