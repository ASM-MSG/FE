import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DEVICE_ID_HEADER } from "@/shared/api/auth-pipeline";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 mutation 옵션은 barrel(generated/index.ts) 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  logoutMutation,
  signupMutation,
  socialLoginMutation,
} from "@/shared/api/generated/@tanstack/react-query.gen";
// 응답 **헤더**(X-Device-Id)가 필요해 생성 mutation 옵션 대신 SDK를 직접 호출한다 —
// 생성 옵션의 mutationFn은 data만 돌려주고 Response를 감춘다 (MSG-325)
import { login, oauthCodeLogin } from "@/shared/api/generated/sdk.gen";
import { deviceIdStorage, fcmTokenStorage } from "@/shared/storage";
import type { Options, SignupData } from "@/shared/api/generated";
import { useAuthStore } from "../model/auth-store";

/**
 * 인증 mutation 훅 (MSG-324 수용 기준 7·8·9) — 생성 SDK mutation 옵션 기반
 * (직접 fetch/URL 하드코딩 없음) + 봉투 언랩 + auth 스토어 배선.
 * 응답의 refreshToken(웹은 HttpOnly 쿠키 관리 — null)은 어디에도 저장하지 않는다.
 * Authorization 주입·401 재발급은 httpClient 파이프라인 소관 — 훅은 관여하지 않는다.
 */

/** dev 모의 로그인 계정 식별자 — 같은 oid면 같은 사용자로 재로그인된다 (스펙 질문 2 기본값) */
const DEV_SOCIAL_LOGIN_OID = "web-local-dev";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다.
// 래핑 훅(변수 고정·봉투 언랩)이 mutationFn을 직접 위임 호출하므로 context도 그대로 전달한다
const socialLoginFn = socialLoginMutation().mutationFn!;
const signupFn = signupMutation().mutationFn!;
const logoutFn = logoutMutation().mutationFn!;

/**
 * 로그인 SDK 호출 공통 처리 (MSG-325·MSG-352) — 응답 헤더의 기기 식별자(X-Device-Id)를
 * deviceIdStorage에 보관해 이후 요청(특히 재발급)에 재사용하고, 응답 data를 돌려준다.
 * 카카오 코드 로그인·이메일 로그인이 공유한다.
 */
const requestSavingDeviceId = async <T>(
  request: () => Promise<{ data: T; response: Response }>,
): Promise<T> => {
  const { data, response } = await request();
  const deviceId = response.headers.get(DEVICE_ID_HEADER);
  if (deviceId !== null) deviceIdStorage.save(deviceId);
  return data;
};

/**
 * dev 모의 소셜 로그인 (기준 7·8) — `/api/auth/dev/social-login`, oid는 코드 상수.
 * provider 생략 = 서버 기본 KAKAO. 성공 시 accessToken을 스토어에 저장한다.
 * 실 OIDC 티켓에서 KakaoLoginButton의 이 훅 호출을 교체한다 (스펙 질문 3 기본값).
 */
export const useDevSocialLogin = () => {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (_variables: void, context) =>
      socialLoginFn({ body: { oid: DEV_SOCIAL_LOGIN_OID } }, context),
    onSuccess: (envelope) => {
      setAccessToken(unwrapEnvelope(envelope).accessToken);
      queryClient.clear();
    },
  });
};

/**
 * 카카오 인가 코드 로그인 (MSG-325) — `/api/auth/oauth/kakao/code`.
 * 서버가 코드를 ID 토큰으로 교환하고 nonce 쿠키와 대조해 검증한다. nonce 쿠키는
 * httpClient의 `credentials: "include"`로 자동 동봉된다(MSG-324) — 훅은 관여하지 않는다.
 * 응답 body의 refreshToken은 웹에서 항상 null이다(HttpOnly 쿠키로 내려감).
 */
export const useKakaoCodeLogin = (callbacks?: {
  onLoggedIn?: () => void;
  onFailed?: (error: unknown) => void;
}) => {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const queryClient = useQueryClient();
  // 콜백을 mutate 호출 인자가 아니라 **훅 레벨 옵션**으로 받는다: mutate의 per-call 콜백은
  // 관찰자가 언마운트되면 버려지는데, StrictMode는 mount→unmount→mount라 첫 마운트에서
  // 시작한 요청의 콜백이 그대로 유실된다(성공 시 화면 전환·실패 시 안내가 통째로 사라짐)
  return useMutation({
    mutationFn: (variables: { code: string; redirectUri: string }) =>
      requestSavingDeviceId(() =>
        oauthCodeLogin({ body: variables, throwOnError: true }),
      ),
    onSuccess: (envelope) => {
      setAccessToken(unwrapEnvelope(envelope).accessToken);
      queryClient.clear();
      callbacks?.onLoggedIn?.();
    },
    onError: (error) => callbacks?.onFailed?.(error),
  });
};

/**
 * 이메일 로그인 (기준 7·8, MSG-352 A2·A3) — `/api/auth/login`, 개발용 로그인(DevLoginPanel) 진입점.
 * useKakaoCodeLogin과 동일하게 SDK를 직접 호출해 응답 헤더 `X-Device-Id`를 deviceIdStorage에
 * 저장한다 — 이후 401 재발급이 카카오 세션과 동일하게 동작하는 전제(MSG-352 추정 8).
 * 변수는 이메일·비밀번호 평면 객체 — 화면이 SDK Options 계층을 모르게 한다.
 */
export const useEmailLogin = () => {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { email: string; password: string }) =>
      requestSavingDeviceId(() =>
        login({ body: variables, throwOnError: true }),
      ),
    onSuccess: (envelope) => {
      setAccessToken(unwrapEnvelope(envelope).accessToken);
      queryClient.clear();
    },
  });
};

/**
 * 이메일 회원가입 (기준 8) — 언랩된 가입 응답을 반환한다. 자동 로그인은 하지 않는다 —
 * 성공 후 동작은 후속 화면 티켓 결정 (추정 7).
 */
export const useSignup = () =>
  useMutation({
    mutationFn: async (variables: Options<SignupData>, context) =>
      unwrapEnvelope(await signupFn(variables, context)),
  });

/**
 * 로그아웃 (기준 9) — `/api/auth/logout` 호출 후 성공·실패와 무관하게(onSettled)
 * 로컬 토큰·인증 상태를 비운다 (로컬 우선 종료). 응답은 봉투 없음(unknown)이라 언랩 비대상.
 * X-Device-Id 미전송 = 서버가 전 디바이스 세션 삭제 (추정 4).
 *
 * MSG-408 AC 9: 보관된 FCM 토큰이 있으면 body에 동봉한다(서버가 세션과 푸시 토큰을 한 번에
 * 정리) — 없으면 기존과 동일하게 body 없이 호출한다. 성공·실패 무관(onSettled) 보관을 비운다.
 * features/notifications를 직접 import하지 않는다 — shared/storage의 fcmTokenStorage 매개.
 *
 * 쿼리 캐시는 비우지 않는다: 교차 사용자 노출은 로그인 쪽 clear()가 이미 막고(다음
 * 세션은 항상 빈 캐시에서 시작), 비로그인 상태의 /profile 직접 진입은 RequireAuth가 막는다.
 * (MSG-325로 로그아웃이 홈 이동을 동반하게 되어 "패널에 남아 401 오류로 떨어진다"는
 * 원래의 회귀 근거는 사라졌으나, 결론은 그대로 유지한다 — 비울 이유가 따로 없다.)
 */
export const useLogout = (callbacks?: { onFinished?: () => void }) => {
  const clearLocalSession = useAuthStore((s) => s.logout);
  // 콜백은 훅 레벨 옵션으로 받는다 — mutate의 per-call 콜백은 관찰자가 언마운트되면
  // 버려지는데, 로그아웃 후 화면을 떠나는 배선이라 정확히 그 상황에 걸린다 (MSG-325)
  return useMutation({
    mutationFn: (_variables: void, context) => {
      const fcmToken = fcmTokenStorage.get();
      return logoutFn(fcmToken !== null ? { body: { fcmToken } } : {}, context);
    },
    onSettled: () => {
      fcmTokenStorage.clear();
      clearLocalSession();
      callbacks?.onFinished?.();
    },
  });
};
