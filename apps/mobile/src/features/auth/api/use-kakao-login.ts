import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authStore } from "../model/auth-session";
import { requestKakaoIdToken } from "./kakao-adapter";
import { kakaoLoginMutationOptions } from "./kakao-login-mutation";

/**
 * 카카오 로그인 훅 (기준 9·10) — 옵션 팩토리(kakao-login-mutation)에 앱 세션 스토어와
 * 네이티브 SDK 어댑터를 물린다. 이동 콜백은 **훅 레벨 옵션**으로 받는다 — mutate per-call
 * 콜백은 관찰자 언마운트 시 유실되고(웹 MSG-325 선례), 로그인은 성공 즉시 화면을 떠난다.
 */
export const useKakaoLogin = (callbacks: { onLoggedIn: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation(
    kakaoLoginMutationOptions({
      queryClient,
      requestIdToken: requestKakaoIdToken,
      setTokens: (tokens) => authStore.setTokens(tokens),
      setDeviceId: (deviceId) => authStore.setDeviceId(deviceId),
      onLoggedIn: callbacks.onLoggedIn,
    }),
  );
};
