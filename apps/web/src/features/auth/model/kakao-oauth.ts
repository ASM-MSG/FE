/**
 * 카카오 로그인 진입점 URL 조립·콜백 해석 (MSG-325).
 * 순수 함수 — 브라우저 API를 직접 참조하지 않는다(RN 경계). 리다이렉트 실행·state 보관은 호출부 소관.
 *
 * 플로우:
 * 1. 프론트 → **서버 진입점**(`/api/auth/oauth/kakao/authorize`)으로 이동
 * 2. 서버가 nonce를 HttpOnly 쿠키로 심고 카카오 인가 URL(앱 키·scope=openid·nonce)을 조립해 302
 * 3. 카카오 → `/oauth/kakao/callback?code=…&state=…`
 * 4. 프론트가 state를 대조하고 `POST /api/auth/oauth/kakao/code`로 코드 전달
 * 5. 서버가 ID 토큰 교환·nonce 대조·검증 후 우리 토큰 발급
 *
 * 카카오 SDK·앱 키·nonce·scope는 전부 서버 몫이라 프론트에 없다 — REST API 키가
 * 클라이언트로 나갈 경로 자체가 없고, scope=openid 누락이 구조적으로 불가능하다.
 */

/** 서버 로그인 진입점 경로 — 이 URL로 이동하면 서버가 카카오로 302 시킨다 */
export const KAKAO_AUTHORIZE_PATH = "/api/auth/oauth/kakao/authorize";

interface KakaoAuthorizeParams {
  /** API 서버 베이스 URL (`VITE_API_BASE_URL`) */
  apiBaseUrl: string;
  /** 카카오 콘솔에 등록된 콜백 주소 — 4단계 요청에도 같은 값을 그대로 보낸다 */
  redirectUri: string;
  /** CSRF 대조용 1회성 토큰 — 콜백에 그대로 돌아온다 */
  state: string;
}

/** 서버 로그인 진입점 URL — 프론트는 여기로 이동하기만 한다 */
export const buildKakaoAuthorizeUrl = ({
  apiBaseUrl,
  redirectUri,
  state,
}: KakaoAuthorizeParams): string => {
  const params = new URLSearchParams({ redirectUri, state });
  return `${apiBaseUrl}${KAKAO_AUTHORIZE_PATH}?${params.toString()}`;
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

/** 로그인 실패 사유 — 서버 developCode 매핑 (백엔드 계약: 2423 / 2502) */
export type KakaoLoginFailure = "expired" | "provider" | "unknown";

/** 인가 코드 재사용·만료, nonce 쿠키 문제 — 처음부터 다시 로그인해야 한다 */
const CODE_EXPIRED = 2423;
/** 카카오 장애·레이트 리밋 — 잠시 후 재시도하면 된다 */
const PROVIDER_UNAVAILABLE = 2502;

/**
 * 실패 값에서 서버 오류코드를 꺼낸다.
 * 정규화 에러(ApiError, MSG-323)와 원시 봉투 둘 다 받는다 — 정규화 인터셉터 등록 여부에
 * 따라 도착 형태가 갈리므로 화면 분기가 그 차이에 흔들리지 않게 한다.
 */
export const developCodeOf = (error: unknown): number | undefined => {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { developCode?: unknown }).developCode;
  return typeof code === "number" ? code : undefined;
};

/** 서버 오류코드 → 실패 사유. 안내 문구가 갈리므로 두 코드를 구분한다 */
export const toKakaoLoginFailure = (
  developCode?: number,
): KakaoLoginFailure => {
  if (developCode === CODE_EXPIRED) return "expired";
  if (developCode === PROVIDER_UNAVAILABLE) return "provider";
  return "unknown";
};
