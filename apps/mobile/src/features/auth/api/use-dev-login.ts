import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  APP_CLIENT_TYPE,
  CLIENT_TYPE_HEADER,
  DEVICE_ID_HEADER,
} from "../../../shared/api/auth-pipeline";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { socialLogin } from "../../../shared/api/sdk";
import { authStore } from "../model/auth-session";

/**
 * dev 모의 소셜 로그인 (AC 5) — `/api/auth/dev/social-login`, `X-Client-Type: app`.
 * 카카오 실 OIDC는 이 티켓 범위 밖(모바일 kakao-login은 스텁)이라, "로그인 성공 시
 * 토큰이 보안 저장소에 저장된다"의 검증은 웹 DevLoginPanel 선례인 이 엔드포인트로 한다
 * (스펙 추정 5 승인). 앱 규약이므로 응답 body에 refreshToken이 채워져 온다.
 *
 * 응답 **헤더**의 X-Device-Id가 필요해 생성 mutation 옵션 대신 SDK를 직접 호출한다
 * (웹 use-auth-mutations 선례 — 생성 옵션은 data만 돌려주고 Response를 감춘다).
 */
const DEV_SOCIAL_LOGIN_OID = "mobile-local-dev";

export const useDevSocialLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, response } = await socialLogin({
        body: { oid: DEV_SOCIAL_LOGIN_OID },
        headers: { [CLIENT_TYPE_HEADER]: APP_CLIENT_TYPE },
        throwOnError: true,
      });
      return {
        tokens: unwrapEnvelope(data),
        deviceId: response.headers.get(DEVICE_ID_HEADER),
      };
    },
    onSuccess: async ({ tokens, deviceId }) => {
      await authStore.setTokens(tokens);
      if (deviceId !== null) {
        await authStore.setDeviceId(deviceId);
      }
      // 이전 세션 캐시가 다음 사용자에게 새지 않도록 비운다 (웹 선례)
      queryClient.clear();
    },
  });
};
