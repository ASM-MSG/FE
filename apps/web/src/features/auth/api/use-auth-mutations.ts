import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 mutation 옵션은 barrel(generated/index.ts) 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  loginMutation,
  logoutMutation,
  signupMutation,
  socialLoginMutation,
} from "@/shared/api/generated/@tanstack/react-query.gen";
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

/** 이메일 로그인 (기준 7·8) — 성공 시 accessToken 스토어 저장까지. 화면 배선은 후속 티켓 (추정 7) */
export const useEmailLogin = () => {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const queryClient = useQueryClient();
  return useMutation({
    ...loginMutation(),
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
 */
/**
 * 리뷰 반영 — 로그아웃은 쿼리 캐시를 비우지 않는다. 교차 사용자 노출은 로그인 쪽
 * clear()가 이미 막고(다음 세션은 항상 빈 캐시에서 시작), 비로그인 상태의 /profile
 * 직접 진입은 RequireAuth가 막는다. 반대로 여기서 비우면 로그아웃 직후 화면에 남아
 * 있는 패널이 로딩 → 401 오류 상태로 떨어진다 — "화면 전환 없이 패널에 머문다"는
 * MSG-124 F2 계약을 깨는 회귀(스모크 테스트가 검출).
 */
export const useLogout = () => {
  const clearLocalSession = useAuthStore((s) => s.logout);
  return useMutation({
    mutationFn: (_variables: void, context) => logoutFn({}, context),
    onSettled: () => {
      clearLocalSession();
    },
  });
};
