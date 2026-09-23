/**
 * 소셜 로그인 실패 판정·안내 문구 (MSG-444 기준 1·2·3 → MSG-601에서 애플까지 provider 매개화) — 순수 함수.
 *
 * 실패는 두 축에서 온다. **네이티브 SDK 거절**은 카카오 SDK의 reason 이름(`Cancelled`·`AccessDenied`·
 * `Misconfigured`…)이나 expo-apple-authentication의 코드(`ERR_REQUEST_CANCELED`…)가 RN 브릿지를
 * 타고 `Error.code`로 실려 오고, **서버 거절**은 정규화된 `ApiError.developCode`로 온다. 화면이 두 축을
 * 따로 알 필요가 없도록 여기서 하나의 사유로 모은다. 서버 코드 체계는 provider와 무관하다 — BE도
 * 같은 서비스(`OidcLoginService`)로 두 provider를 처리한다.
 *
 * `developCodeOf`·`toKakaoLoginFailure`는 웹 MSG-325 `features/auth/model/kakao-oauth.ts`의
 * 복제본이다 — 동등성은 social-login-failure.parity.test.ts가 웹 원본 동적 import로 고정한다
 * (이름·본문 불변 — parity 앵커). 같은 파일의 나머지(진입점 URL 조립·콜백 쿼리 해석)는 서버 주도
 * 웹 플로우 전용이라 포팅 대상이 아니다: 모바일은 네이티브 SDK 경로라 돌려받을 콜백 URL 자체가 없다.
 *
 * 플랫폼 API·라우터 무의존 (RN 경계 — 순수 모델).
 */

/** 소셜 제공자 — mutation·어댑터·화면이 이 타입을 공유한다 */
export type SocialProvider = "kakao" | "apple";

/** 카카오 앱 키 미설정 — 어댑터가 SDK를 로드하기 전에 던진다 (MSG-444 기준 7) */
export const KAKAO_NOT_CONFIGURED = "NotConfigured";
/**
 * SDK 로그인은 됐는데 ID 토큰이 없다 — 카카오는 콘솔 OpenID Connect 미활성(MSG-444 기준 5),
 * 애플은 `identityToken: null`(MSG-601 L4). 값은 MSG-444의 `"MissingIdToken"` 그대로다.
 */
export const MISSING_ID_TOKEN = "MissingIdToken";
/** iOS가 아닌 플랫폼에서 애플 어댑터를 부른 경우 — 네이티브 모듈을 로드하기 전에 던진다 (MSG-601 A8) */
export const APPLE_UNAVAILABLE = "AppleUnavailable";

/**
 * 사용자가 스스로 그만둔 경우 — 카카오톡 화면에서 뒤로 나오면 `Cancelled`(ClientError),
 * 카카오계정 동의 화면에서 거절하면 `AccessDenied`(AuthError), 애플 시스템 시트를 닫으면
 * `ERR_REQUEST_CANCELED`가 온다.
 */
const CANCELLED_CODES = new Set([
  "Cancelled",
  "AccessDenied",
  "ERR_REQUEST_CANCELED",
]);

/** 재시도로 풀리지 않는 설정 문제 — 앱 키·키 해시 미등록, OIDC 미활성, 비iOS에서의 애플 호출 */
const MISCONFIGURED_CODES = new Set([
  "Misconfigured",
  KAKAO_NOT_CONFIGURED,
  MISSING_ID_TOKEN,
  APPLE_UNAVAILABLE,
]);

/**
 * 서버가 소셜 ID 토큰 자체를 거절했다 (401 `2421`).
 * 2026-08-21 실기 환류 — 카카오 로그인·ID 토큰 발급은 성공했는데 서버 검증에서 떨어졌다.
 * 토큰의 `aud`는 **네이티브 앱 키**인데 서버가 검증하는 기준은 웹이 쓰는 **REST API 키**라
 * 값이 갈린다(같은 카카오 애플리케이션이어도 앱 키가 플랫폼별로 다르다). 사용자가 다시 눌러도
 * 절대 풀리지 않으므로 재시도를 권하는 문구로 보내면 안 된다 — 설정 축으로 분류한다.
 * 애플에서는 nonce 대조 실패(원문/해시 뒤바뀜·대문자 hex)가 같은 코드로 온다(MSG-601 R3).
 * 웹은 서버가 코드 교환을 대신해 이 코드를 볼 일이 없어 `kakao-oauth.ts`에 없다(모바일 전용 축).
 */
const SOCIAL_TOKEN_REJECTED = 2421;

/** 로그인 실패 사유 — 서버 developCode 매핑 (백엔드 계약: 2423 / 2502) */
export type KakaoLoginFailure = "expired" | "provider" | "unknown";

/** 인가 코드 재사용·만료, nonce 쿠키 문제 — 처음부터 다시 로그인해야 한다 */
const CODE_EXPIRED = 2423;
/** 카카오 장애·레이트 리밋 — 잠시 후 재시도하면 된다 */
const PROVIDER_UNAVAILABLE = 2502;

/**
 * 실패 값에서 서버 오류코드를 꺼낸다.
 * 정규화 에러(ApiError, MSG-419)와 원시 봉투 둘 다 받는다 — 정규화 인터셉터 등록 여부에
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

/** 로그인 시도가 끝난 사유 — 취소·설정 오류는 모바일(네이티브 SDK) 경로에만 있다 */
export type SocialLoginReason =
  | "cancelled"
  | "misconfigured"
  | KakaoLoginFailure;

/** 네이티브 브릿지가 실어 보낸 거절 코드 */
const errorCodeOf = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
};

/**
 * 실패 값 → 사유. SDK 거절 코드를 먼저 보고, 해당 없으면 서버 developCode로 넘긴다.
 * 어느 축에도 걸리지 않는 값(네트워크 실패·비객체·애플 `ERR_REQUEST_UNKNOWN` 류)은 `unknown`으로
 * 떨어져 판정이 비지 않는다.
 */
export const resolveSocialLoginReason = (error: unknown): SocialLoginReason => {
  const code = errorCodeOf(error);
  if (code !== undefined && CANCELLED_CODES.has(code)) return "cancelled";
  if (code !== undefined && MISCONFIGURED_CODES.has(code))
    return "misconfigured";
  const developCode = developCodeOf(error);
  if (developCode === SOCIAL_TOKEN_REJECTED) return "misconfigured";
  return toKakaoLoginFailure(developCode);
};

/** 안내 문구에 들어가는 제공자 이름 — 카카오 문구 4종은 MSG-444 문자열 그대로다 */
const PROVIDER_LABELS: Record<SocialProvider, string> = {
  kakao: "카카오",
  apple: "Apple",
};

const NOTICES: Record<
  Exclude<SocialLoginReason, "cancelled">,
  (label: string) => string
> = {
  misconfigured: (label) =>
    `${label} 로그인 설정에 문제가 있어요. 문제가 계속되면 문의해 주세요.`,
  expired: () => "로그인 요청이 만료됐어요. 다시 시도해 주세요.",
  provider: (label) =>
    `${label} 서버가 불안정해요. 잠시 후 다시 시도해 주세요.`,
  unknown: () => "로그인에 실패했어요. 다시 시도해 주세요.",
};

/**
 * 사용자에게 띄울 안내 문구. **취소는 null** — 스스로 그만둔 것을 오류로 보이면 안 된다
 * (동작 요구: "취소하고 돌아오면 로그인 화면에 머물고 오류로 표시하지 않는다").
 */
export const socialLoginNotice = (
  reason: SocialLoginReason,
  provider: SocialProvider,
): string | null =>
  reason === "cancelled" ? null : NOTICES[reason](PROVIDER_LABELS[provider]);
