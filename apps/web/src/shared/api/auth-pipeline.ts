import type { AfterResponseHook, BeforeRequestHook } from "ky";
import { unwrapEnvelope } from "./envelope";

/**
 * 인증 파이프라인 (MSG-324 수용 기준 1~6) — httpClient(Ky)의 beforeRequest/afterResponse
 * 훅 구현과 401 재발급 single-flight를 소유한다.
 *
 * FSD 경계: shared는 features를 import할 수 없으므로 스토어 배선은 부트스트랩 등록
 * (콜백 주입) 패턴을 쓴다 — main.tsx가 `configureAuthPipeline`을 1회 호출한다
 * (MSG-323 registerApiErrorInterceptor 선례). 미등록 상태(테스트·스토리북 등)에서는
 * 모든 훅이 무개입 통과한다.
 */

type AuthPipelineConfig = {
  /** 현재 저장된 액세스 토큰 — 없으면 null (Authorization 헤더 미주입) */
  getAccessToken: () => string | null;
  /** 재발급 성공 — 새 액세스 토큰을 스토어에 반영 */
  onTokenRefreshed: (accessToken: string) => void;
  /** 세션 만료(재발급 실패 또는 재시도 후에도 401) — 토큰 클리어 + 로그인 모달 */
  onSessionExpired: () => void;
};

let config: AuthPipelineConfig | null = null;

/** 앱 부트스트랩(main.tsx)에서 1회 호출 — 스토어·모달 배선을 주입한다 */
export const configureAuthPipeline = (next: AuthPipelineConfig): void => {
  config = next;
};

/**
 * 401이 재발급을 트리거하지 않는 auth 엔드포인트 (수용 기준 4 — 무한 루프 방지).
 * reissue 자신이 반드시 포함돼야 한다: 재발급 요청도 같은 httpClient 훅을 타기 때문.
 */
const AUTH_ENDPOINT_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/reissue",
  "/api/auth/dev/social-login",
]);

const isAuthEndpoint = (url: string): boolean =>
  AUTH_ENDPOINT_PATHS.has(new URL(url).pathname);

/**
 * 401 재시도용 요청 사본 — fetch가 원 Request의 body를 소모하므로(POST 등)
 * 전송 전에 클론을 보관해 둔다. 키가 원 Request 객체라 응답 후 자동 회수된다.
 */
const retryClones = new WeakMap<Request, Request>();

/** single-flight 락 — 동시 다발 401이 하나의 재발급 결과를 공유한다 (수용 기준 3) */
let reissueInFlight: Promise<string | null> | null = null;

/** 재발급 1회 수행 — 성공 시 새 토큰, 실패 시 null (호출자가 세션 만료 처리) */
const reissueAccessToken = async (): Promise<string | null> => {
  try {
    // 동적 import — 정적으로 걸면 sdk.gen → client.gen → client-config → http-client →
    // auth-pipeline 순환이 생겨 httpClient가 TDZ 상태로 참조된다
    // (client-config가 error-interceptor와 분리된 것과 같은 순환 회피, MSG-323 선례)
    const { reissue } = await import("./generated/sdk.gen");
    const { data } = await reissue({
      // 서버 기본값도 web이지만 티켓이 헤더를 명시했으므로 명시 전송 (추정 6)
      headers: { "X-Client-Type": "web" },
      throwOnError: true,
    });
    const { accessToken } = unwrapEnvelope(data);
    config?.onTokenRefreshed(accessToken);
    return accessToken;
  } catch {
    return null;
  }
};

/**
 * 수용 기준 1 — 저장 토큰이 있으면 Authorization: Bearer 주입, 없으면 헤더 미부착.
 *
 * 단, AUTH_ENDPOINT_PATHS에는 주입하지 않는다: 재발급이 필요한 시점의 액세스 토큰은
 * 정의상 무효인데, 서버는 reissue에 Authorization이 붙어 있으면 그 토큰을 검증해
 * 401(2401)로 거부한다(실서버 실측: 헤더 없음 200 / 무효 토큰 401 / 유효 토큰 200).
 * 붙이면 재발급이 필요한 바로 그 순간에만 재발급이 실패한다.
 * logout은 Authorization이 필수라 이 목록에 없다 — 의도된 비대칭(테스트가 고정).
 */
export const authBeforeRequest: BeforeRequestHook = ({ request }) => {
  if (isAuthEndpoint(request.url)) {
    return;
  }
  const accessToken = config?.getAccessToken() ?? null;
  if (accessToken !== null) {
    request.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  retryClones.set(request, request.clone());
};

/**
 * 수용 기준 2~5 — 보호 API 401을 single-flight 재발급 후 새 토큰으로 정확히 1회
 * 재시도한다. 재시도는 raw fetch로 수행해 훅 재진입이 구조적으로 불가능하다
 * (재시도의 401이 다시 재발급을 트리거하는 루프 차단).
 */
export const authAfterResponse: AfterResponseHook = async ({
  request,
  response,
}) => {
  if (
    response.status !== 401 ||
    isAuthEndpoint(request.url) ||
    config === null
  ) {
    return; // 원 응답 그대로 반환
  }
  const activeConfig = config;

  reissueInFlight ??= reissueAccessToken().finally(() => {
    reissueInFlight = null;
  });
  const accessToken = await reissueInFlight;

  if (accessToken === null) {
    // 재발급 실패 — 세션 만료 처리 후 원 401을 그대로 반환 (추가 재시도 없음)
    activeConfig.onSessionExpired();
    return;
  }

  const retryRequest = retryClones.get(request) ?? request;
  retryClones.delete(request);
  retryRequest.headers.set("Authorization", `Bearer ${accessToken}`);
  const retryResponse = await fetch(retryRequest);
  if (retryResponse.status === 401) {
    // 새 토큰으로도 401 — 세션 만료 처리, 재시도는 1회로 끝 (수용 기준 5)
    activeConfig.onSessionExpired();
  }
  return retryResponse;
};
