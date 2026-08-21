import type { AfterResponseHook, BeforeRequestHook } from "ky";
import { unwrapEnvelope } from "./envelope";

/**
 * 모바일 인증 파이프라인 (AC 6·7·8) — httpClient(Ky)의 beforeRequest/afterResponse 훅과
 * 401 재발급 single-flight를 소유한다. 웹 `shared/api/auth-pipeline.ts` 이식.
 *
 * 앱 규약 차이(생성 타입 명세):
 * - 리프레시 토큰이 쿠키가 아니라 **body**로 오간다 → `X-Client-Type: app` + body refreshToken
 * - 재발급 응답의 회전된 refreshToken을 갱신 저장한다 (옛 토큰 재사용 = 세션 체인 폐기)
 * - 저장 refreshToken이 없으면(익명) 재발급 자체를 생략한다 (AC 8 — 웹 MSG-325 교훈)
 * - 재발급은 시작 시점의 **세션 세대**를 캡처해, 완료 시점 세대가 다르면 결과를 폐기한다
 *   (재발급이 오가는 동안 로그아웃·재로그인이 일어나면 늦게 도착한 발급분이 죽은 세션을
 *   되살리거나 새 세션을 덮어쓴다 — codex 리뷰가 잡은 결함)
 *
 * FSD·RN 경계: shared는 features(스토어)·expo-router를 import하지 않는다. 토큰 읽기/쓰기와
 * 세션 만료 처리는 전부 부트스트랩이 주입하는 콜백이다(웹 configureAuthPipeline 선례).
 * 미등록 상태(테스트·스토리북)에서는 모든 훅이 무개입 통과한다.
 */

export type AuthPipelineConfig = {
  /** 현재 저장된 액세스 토큰 — 없으면 null (Authorization 헤더 미주입) */
  getAccessToken: () => string | null;
  /** 현재 저장된 리프레시 토큰 — 없으면 null (재발급 생략, AC 8) */
  getRefreshToken: () => string | null;
  /** 서버가 로그인 응답으로 내려준 기기 식별자 — 없으면 null */
  getDeviceId: () => string | null;
  /** 현재 세션 세대 — 로그아웃·세션 만료마다 증가한다 (발급분 유효성 판정 키) */
  getSessionGeneration: () => number;
  /**
   * 재발급 성공 — 새 액세스 토큰과 회전된 리프레시 토큰을 저장한다.
   * **저장이 끝나야 resolve**하며, reject(저장 실패)는 재발급 실패로 취급된다.
   * `sessionGeneration`은 재발급을 시작한 세대이므로, 수신 측은 그 세대가 아직
   * 유효할 때만 적용해야 한다.
   */
  onTokensIssued: (
    tokens: {
      accessToken: string;
      refreshToken: string | null;
    },
    sessionGeneration: number,
  ) => Promise<void>;
  /** 세션 만료(재발급 실패 또는 재시도 후에도 401) — 토큰 클리어 + 로그인 화면 이동 */
  onSessionExpired: () => void;
};

let config: AuthPipelineConfig | null = null;

/** 앱 부트스트랩에서 1회 호출 — 스토어·네비게이션 배선을 주입한다 */
export const configureAuthPipeline = (next: AuthPipelineConfig): void => {
  config = next;
};

/** 서버가 로그인 응답으로 내려주는 기기 식별 헤더 */
export const DEVICE_ID_HEADER = "X-Device-Id";

/** 앱 클라이언트 규약 — 리프레시 토큰을 body로 주고받는다(웹은 HttpOnly 쿠키) */
export const CLIENT_TYPE_HEADER = "X-Client-Type";
export const APP_CLIENT_TYPE = "app";

/**
 * 401이 재발급을 트리거하지 않는 auth 엔드포인트 (무한 루프 방지).
 * reissue 자신이 반드시 포함돼야 한다: 재발급 요청도 같은 httpClient 훅을 타기 때문.
 */
const AUTH_ENDPOINT_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/reissue",
  "/api/auth/dev/social-login",
]);

/** provider가 경로 파라미터인 엔드포인트 — `/api/auth/oauth/{provider}` (실 소셜 로그인) */
const AUTH_ENDPOINT_PREFIXES = ["/api/auth/oauth/"];

/** `/api/auth/logout`은 Authorization이 필수라 의도적으로 제외 대상이 아니다 (테스트가 고정) */
const isAuthEndpoint = (url: string): boolean => {
  const { pathname } = new URL(url);
  return (
    AUTH_ENDPOINT_PATHS.has(pathname) ||
    AUTH_ENDPOINT_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
};

/**
 * 401 재시도용 요청 사본 — fetch가 원 Request의 body를 소모하므로(POST 등)
 * 전송 전에 클론을 보관해 둔다. 키가 원 Request 객체라 응답 후 자동 회수된다.
 */
const retryClones = new WeakMap<Request, Request>();

/**
 * 재발급 결과 — "실패"와 "폐기"는 후처리가 정반대라 구분한다.
 * 실패는 세션 만료 처리를 부르고, 폐기는 (이미 다른 세션이 유효하므로) 아무것도 하지 않는다.
 */
type ReissueOutcome =
  | { status: "issued"; accessToken: string }
  | { status: "failed" }
  | { status: "discarded" };

/** single-flight 락 — 동시 다발 401이 하나의 재발급 결과를 공유한다 */
let reissueInFlight: Promise<ReissueOutcome> | null = null;
/** 진행 중 재발급이 속한 세션 세대 — 세대가 바뀌면 그 결과에 편승하지 않는다 */
let reissueGeneration: number | null = null;

/** 재발급 1회 수행 — 발급/실패/폐기 중 하나를 반환한다 (호출자가 후처리를 결정) */
const reissueAccessToken = async (
  refreshToken: string,
  startGeneration: number,
): Promise<ReissueOutcome> => {
  const activeConfig = config;
  if (activeConfig === null) return { status: "failed" };
  try {
    // 동적 import — 정적으로 걸면 sdk → client.gen → client-config → http-client →
    // auth-pipeline 순환이 생겨 httpClient가 TDZ 상태로 참조된다 (웹 선례)
    const { reissue } = await import("./sdk");
    const { data } = await reissue({
      headers: { [CLIENT_TYPE_HEADER]: APP_CLIENT_TYPE },
      body: { refreshToken },
      throwOnError: true,
    });
    const tokens = unwrapEnvelope(data);
    if (activeConfig.getSessionGeneration() !== startGeneration) {
      // 재발급이 오가는 동안 로그아웃·재로그인이 있었다 — 저장하지 않고 버린다
      return { status: "discarded" };
    }
    // 저장까지 성공해야 발급 성공이다: 회전된 refreshToken이 디스크에 남지 않으면
    // 다음 실행에서 서버가 이미 폐기한 옛 토큰만 남아 세션이 끊긴다
    await activeConfig.onTokensIssued(tokens, startGeneration);
    return { status: "issued", accessToken: tokens.accessToken };
  } catch {
    return { status: "failed" };
  }
};

/** `/api/auth/logout`은 전 디바이스 세션 삭제가 확정 동작이라 기기를 특정하지 않는다 */
const NO_DEVICE_ID_PATHS = new Set(["/api/auth/logout"]);

/**
 * 저장된 디바이스 식별자를 요청에 싣는다 — 재발급이 같은 디바이스 세션을 갱신하도록.
 * auth 엔드포인트(reissue 포함)에도 붙여야 하므로 토큰 주입보다 앞에서 처리한다.
 */
const attachDeviceId = (request: Request): void => {
  const deviceId = config?.getDeviceId() ?? null;
  if (deviceId === null) return;
  if (NO_DEVICE_ID_PATHS.has(new URL(request.url).pathname)) return;
  request.headers.set(DEVICE_ID_HEADER, deviceId);
};

/**
 * 저장 토큰이 있으면 Authorization: Bearer 주입, 없으면 헤더 미부착.
 *
 * 단, AUTH_ENDPOINT_PATHS에는 주입하지 않는다: 재발급이 필요한 시점의 액세스 토큰은
 * 정의상 무효인데, 서버는 reissue에 Authorization이 붙어 있으면 그 토큰을 검증해
 * 401로 거부한다(웹 실서버 실측). logout은 Authorization이 필수라 이 목록에 없다.
 */
export const authBeforeRequest: BeforeRequestHook = ({ request }) => {
  attachDeviceId(request);
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
 * 보호 API 401을 single-flight 재발급 후 새 토큰으로 정확히 1회 재시도한다.
 * 재시도는 raw fetch로 수행해 훅 재진입이 구조적으로 불가능하다
 * (재시도의 401이 다시 재발급을 트리거하는 루프 차단).
 *
 * 저장 refreshToken이 없으면 원 401을 그대로 반환한다 (AC 8) — 비로그인 상태에서
 * 상시 발생하는 익명 401이 로그인 화면 강제 이동을 유발하지 않게 한다.
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

  const refreshToken = activeConfig.getRefreshToken();
  if (refreshToken === null) {
    return; // 익명 401 — 재발급·만료 처리 모두 없음 (AC 8)
  }

  const startGeneration = activeConfig.getSessionGeneration();
  if (reissueInFlight !== null && reissueGeneration !== startGeneration) {
    // 진행 중 재발급은 이미 끝난 세션의 것이다 — 편승하지 않고 이 세션으로 새로 시작한다
    // (명시적 로그아웃이 in-flight 락을 무효화하는 지점)
    reissueInFlight = null;
    reissueGeneration = null;
  }
  if (reissueInFlight === null) {
    const flight: Promise<ReissueOutcome> = reissueAccessToken(
      refreshToken,
      startGeneration,
    ).finally(() => {
      // 그사이 새 세대의 재발급이 시작됐으면 그쪽 락을 건드리지 않는다
      if (reissueInFlight === flight) {
        reissueInFlight = null;
        reissueGeneration = null;
      }
    });
    reissueInFlight = flight;
    reissueGeneration = startGeneration;
  }
  const outcome = await reissueInFlight;

  if (
    outcome.status === "discarded" ||
    activeConfig.getSessionGeneration() !== startGeneration
  ) {
    // 이 요청이 속한 세션은 이미 끝났다 — 재시도도, 세션 만료 처리도 하지 않는다
    return;
  }

  if (outcome.status === "failed") {
    // 재발급 실패 — 세션 만료 처리 후 원 401을 그대로 반환 (추가 재시도 없음)
    activeConfig.onSessionExpired();
    return;
  }

  const retryRequest = retryClones.get(request) ?? request;
  retryClones.delete(request);
  retryRequest.headers.set("Authorization", `Bearer ${outcome.accessToken}`);
  // 이 fetch가 던지면(취소·네트워크 장애) 오류를 그대로 전파한다 — 재발급이 이미 성공해
  // 세션은 유효하므로 만료 처리 대상이 아니다 (웹 리뷰 결론 이식).
  const retryResponse = await fetch(retryRequest);
  if (retryResponse.status === 401) {
    // 새 토큰으로도 401 — 세션 만료 처리, 재시도는 1회로 끝
    activeConfig.onSessionExpired();
  }
  return retryResponse;
};
