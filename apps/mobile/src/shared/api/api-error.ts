/**
 * API 에러 정규화 — 웹 `shared/api/api-error.ts`의 모바일 복제본
 * (수기 모듈은 복제 + parity 테스트로 고정 — api-error.parity.test.ts, 스펙 추정 3).
 *
 * HTTP 에러 봉투·비봉투 바디·네트워크 실패를 단일 `ApiError`로 통일해 화면 코드가
 * 봉투·HTTP 계층을 모르게 한다. `normalizeApiError`는 생성 클라이언트의
 * `interceptors.error`에서 호출된다 (error-interceptor.ts).
 */

/**
 * 정규화된 API 에러 — TanStack Query의 error 기본 타이핑(Error)과 정합하고
 * `instanceof ApiError`로 화면 코드가 안전하게 분기한다.
 *
 * - `status` 없음 = 네트워크 실패(fetch reject) — 응답 자체가 없던 경우
 * - `developCode` = 백엔드 봉투의 도메인 에러 코드 (봉투 바디였을 때만)
 */
export class ApiError extends Error {
  readonly status?: number;
  readonly developCode?: number;

  constructor(
    message: string,
    options: { status?: number; developCode?: number } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.developCode = options.developCode;
  }
}

/** 에러 바디가 백엔드 공통 봉투({developCode, message, ...}) 형태인지 판별 */
const isErrorEnvelope = (
  value: unknown,
): value is { developCode: number; message: string } =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { developCode?: unknown }).developCode === "number" &&
  typeof (value as { message?: unknown }).message === "string";

/**
 * hey-api `interceptors.error`가 넘겨주는 (에러, 응답) 쌍을 ApiError로 정규화한다.
 *
 * - 봉투 바디(예: 401 `{developCode: 2403, ...}`) → status·developCode·message
 * - 봉투가 아닌 바디(문자열·파싱 불가 JSON·빈 바디) → status·message만
 * - 네트워크 실패(fetch reject — response 없음) → status 없는 ApiError
 */
export const normalizeApiError = (
  error: unknown,
  response?: Response,
): ApiError => {
  const status = response?.status;

  if (isErrorEnvelope(error)) {
    return new ApiError(error.message, {
      status,
      developCode: error.developCode,
    });
  }

  if (typeof error === "string" && error !== "") {
    return new ApiError(error, { status });
  }

  if (error instanceof Error && error.message !== "") {
    return new ApiError(error.message, { status });
  }

  return new ApiError(
    status === undefined ? "요청에 실패했습니다" : `HTTP ${status}`,
    { status },
  );
};

/** 재시도 최대 횟수 — 최초 시도 제외 (총 최대 3회 시도) */
const MAX_QUERY_RETRIES = 2;

/**
 * TanStack Query 전역 retry 판정 (QueryProvider defaultOptions.queries.retry).
 *
 * 네트워크 오류(status 없음)·5xx만 최대 2회 재시도, 4xx는 0회.
 * ApiError가 아닌 에러(정규화를 거치지 않은 예외)는 재시도하지 않는다 — 보수적 판정.
 * failureCount는 0부터 시작해 판정 후 증가하므로 `< 2`가 "재시도 최대 2회"다.
 */
export const shouldRetryQuery = (
  failureCount: number,
  error: unknown,
): boolean => {
  if (!(error instanceof ApiError)) return false;

  const isRetryable = error.status === undefined || error.status >= 500;
  return isRetryable && failureCount < MAX_QUERY_RETRIES;
};
