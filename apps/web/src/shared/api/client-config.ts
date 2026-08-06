import type { CreateClientConfig } from "./generated/client.gen";
import { httpClient } from "./http-client";

/**
 * hey-api 런타임 설정 — `openapi-ts.config.ts`의 `runtimeConfigPath`가 이 파일을 가리키며,
 * 생성된 client.gen.ts가 클라이언트 초기화 시 1회 호출한다 (MSG-323 수용 기준 4).
 *
 * - `baseUrl`: env 직참조, 코드 폴백 없음 — 미설정이면 아래 가드가 모듈 로드(=앱 부트) 시점에
 *   throw해 드러난다 (조용한 오배포 방지, 스펙 질문 5 승인 + 리뷰 반영).
 *   가드 없이 undefined를 넘기면 생성 클라이언트의 명세 기본값을 spread로 덮어쓰고
 *   getUrl이 상대경로를 만들어 자기 origin으로 조용히 오요청한다 — throw가 유일한 조기 신호.
 * - `fetch`: Ky 인스턴스 주입 — hey-api가 만든 Request를 Ky가 실행한다 (http-client.ts).
 *
 * client.gen.ts가 이 파일을 import하는 방향이므로 여기서는 client.gen의 "타입만" import한다
 * (verbatimModuleSyntax로 런타임에서 지워져 순환 없음). client 값을 쓰는 코드는
 * error-interceptor.ts처럼 별도 모듈로 분리할 것.
 */
const baseUrl = import.meta.env.VITE_API_BASE_URL;
if (!baseUrl) {
  throw new Error(
    "VITE_API_BASE_URL이 설정되지 않았습니다 — .env.local(로컬)/배포 환경변수를 확인하세요.",
  );
}

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl,
  fetch: httpClient,
});
