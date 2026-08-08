/**
 * 카카오 OIDC 인가 요청·콜백 해석 (MSG-325).
 * 순수 함수 — 브라우저 API를 직접 참조하지 않는다(RN 경계). 리다이렉트 실행·state 보관은 호출부 소관.
 *
 * 플로우: 인가 요청(여기) → 카카오 로그인 → `/oauth/kakao/callback?code=…` → **서버가 code를
 * id_token으로 교환** → 기존 `/api/auth/oauth/{provider}` 경로. 교환을 서버가 하는 이유는
 * 카카오가 토큰 요청에 REST API 키를 요구하는데 그 키를 프론트에 둘 수 없기 때문이다
 * (JS SDK도 브라우저에 id_token을 주지 않는다). 교환 엔드포인트는 백엔드 대기 중 —
 * 지라 MSG-325 코멘트 참조.
 *
 * SDK를 싣지 않고 URL을 직접 조립한다: `Kakao.Auth.authorize`가 하는 일이 정확히
 * 이 엔드포인트로의 리다이렉트라 SDK 스크립트를 더할 이유가 없다(단순성 우선).
 */

/** 카카오 인가 엔드포인트 */
export const KAKAO_AUTHORIZE_ENDPOINT =
  "https://kauth.kakao.com/oauth/authorize";

/**
 * 실 카카오 로그인 활성 여부 (`VITE_KAKAO_LOGIN_ENABLED === "true"`).
 *
 * 기본값은 **비활성**이다: 인가 코드 → ID 토큰 교환을 담당할 서버 엔드포인트가 아직 없어
 * 실 플로우가 완결되지 않는다. 활성화하면 인가 리다이렉트까지는 가지만 로그인은 끝나지 않으므로,
 * 비활성 시에는 기존 dev 모의 로그인 경로를 그대로 유지해 **어떤 환경에서도 로그인이 깨지지 않게** 한다.
 * 서버 교환 엔드포인트가 연결되면 이 플래그와 dev 경로를 함께 제거한다.
 */
export const isKakaoLoginEnabled = (): boolean =>
  import.meta.env.VITE_KAKAO_LOGIN_ENABLED === "true";

/**
 * 요청 scope — `openid`가 있어야 ID 토큰이 발급된다(카카오 OIDC 필수).
 * 서버는 ID 토큰만 쓰므로 프로필 동의항목은 더하지 않는다.
 */
const SCOPE = "openid";

interface KakaoAuthorizeParams {
  /** 카카오 JavaScript 앱 키 — 공개 전제 키다. REST API 키를 넣지 말 것 */
  jsKey: string;
  /** 카카오 콘솔에 등록된 값과 정확히 일치해야 한다 */
  redirectUri: string;
  /** CSRF 대조용 1회성 토큰 — 콜백에서 그대로 돌아온다 */
  state: string;
}

/** 인가 코드 플로우 요청 URL */
export const buildKakaoAuthorizeUrl = ({
  jsKey,
  redirectUri,
  state,
}: KakaoAuthorizeParams): string => {
  const params = new URLSearchParams({
    client_id: jsKey,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    state,
  });
  return `${KAKAO_AUTHORIZE_ENDPOINT}?${params.toString()}`;
};

/** 콜백 해석 결과 — 성공(code)·거절/실패(error)·잘못된 진입(invalid) 3분기 */
export type KakaoCallbackResult =
  | { status: "code"; code: string; state: string | null }
  | { status: "error"; error: string; description: string | null }
  | { status: "invalid" };

/**
 * 콜백 쿼리스트링 해석. state 대조는 저장된 값을 아는 호출부가 한다 —
 * 이 함수는 보관소(sessionStorage 등 웹 API)를 모른다.
 */
export const parseKakaoCallback = (search: string): KakaoCallbackResult => {
  const params = new URLSearchParams(search);

  const code = params.get("code");
  if (code !== null)
    return { status: "code", code, state: params.get("state") };

  const error = params.get("error");
  if (error !== null) {
    return {
      status: "error",
      error,
      description: params.get("error_description"),
    };
  }

  return { status: "invalid" };
};
