import { normalizeApiError } from "./api-error";
import { client } from "./sdk";

/**
 * 생성 클라이언트에 에러 정규화 인터셉터를 등록한다 (AC 4) — 앱 부트스트랩에서 1회 호출.
 *
 * HTTP 에러(파싱된 봉투 바디)와 네트워크 실패(fetch reject) 모두 이 인터셉터를 통과하며
 * (실패 시 response는 undefined), 생성 queryOptions는 throwOnError로 호출하므로
 * 정규화된 `ApiError`가 쿼리 error까지 그대로 전파된다 (웹 MSG-323과 동일 구조).
 */
export const registerApiErrorInterceptor = (): void => {
  client.interceptors.error.use((error, response) =>
    normalizeApiError(error, response),
  );
};
