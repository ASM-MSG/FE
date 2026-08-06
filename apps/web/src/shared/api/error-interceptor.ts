import { normalizeApiError } from "./api-error";
import { client } from "./generated/client.gen";

/**
 * hey-api 클라이언트에 에러 정규화 인터셉터를 등록한다 — 앱 부트스트랩(main.tsx)에서 1회 호출.
 *
 * client.gen.ts의 client "값"을 import하므로 client-config.ts(client.gen이 역으로 import)와
 * 분리해 순환 의존을 피한다 (스펙 질문 2 승인).
 *
 * HTTP 에러(hey-api가 파싱한 봉투 바디)와 네트워크 실패(fetch reject) 모두 이 인터셉터를
 * 통과한다 — hey-api 0.99 fetch 클라이언트는 요청 전 과정을 단일 try로 감싸고 catch에서
 * interceptors.error를 순회하며, 네트워크 실패 시 response가 undefined로 전달된다(소스 확인).
 * 생성된 queryOptions는 throwOnError: true로 호출하므로 정규화된 ApiError가 화면까지 전파된다.
 */
export const registerApiErrorInterceptor = () => {
  client.interceptors.error.use((error, response) =>
    normalizeApiError(error, response),
  );
};
