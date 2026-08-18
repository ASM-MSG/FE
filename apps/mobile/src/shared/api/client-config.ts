import { httpClient } from "./http-client";
import type { CreateClientConfig } from "./sdk";

/**
 * 생성 클라이언트 런타임 설정 (AC 3) — 웹 `client-config.ts`의 모바일 대응.
 *
 * 생성물 `client.gen.ts`는 `'../client-config'`(웹 파일)를 정적 import하지만, 모바일
 * 번들에서는 metro `resolver.resolveRequest`(테스트는 vitest 플러그인)가 그 요청을
 * 이 파일로 치환한다. **모든 모바일 API 호출이 모바일 Ky를 거치게 하는 단일 지점**이며,
 * 동시에 웹 http-client·auth-pipeline·localStorage 체인을 번들에서 배제한다.
 *
 * - `baseUrl`: env 직참조, 코드 폴백 없음 — 미설정이면 모듈 로드(=앱 부트) 시점에 throw.
 *   가드가 없으면 undefined가 생성 클라이언트의 명세 기본값을 spread로 덮어써
 *   상대경로로 조용히 오요청한다(웹 MSG-323 실측 결함).
 * - `fetch`: 모바일 Ky 인스턴스 주입 (http-client.ts).
 *
 * 예외는 온디바이스 Storybook 번들(`EXPO_PUBLIC_STORYBOOK=1`) 하나다 — UI 전용 모드라
 * API를 쓰지 않는데, 이 모듈은 라우트 트리 전체의 정적 import 체인에 걸려 있어
 * (루트 `_layout` → auth-session → error-interceptor → sdk → client.gen, 그리고
 * expo-router가 dev에서 eager 평가하는 `app/dev/api-smoke.tsx`의 sdk import)
 * 부트 throw가 Storybook까지 죽인다. 그 모드에서만 부트 throw를 생략하되 **폴백은 주지
 * 않는다** — fetch를 즉시 실패하는 가드로 바꿔, 미설정이 실제 호출 경로를 조용히
 * 통과하는 일이 없게 한다(client-config.storybook.test.ts가 양방향 고정).
 *
 * `CreateClientConfig`는 **타입만** import한다 — 값 import는 client.gen ↔ 이 파일의
 * 런타임 순환을 만든다(웹 선례). client 값을 쓰는 코드는 error-interceptor.ts로 분리.
 */
const MISSING_BASE_URL =
  "EXPO_PUBLIC_API_BASE_URL이 설정되지 않았습니다 — apps/mobile/.env(.env.example 참조)를 확인하세요.";

const isStorybookBundle = process.env.EXPO_PUBLIC_STORYBOOK === "1";
const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!baseUrl && !isStorybookBundle) {
  throw new Error(MISSING_BASE_URL);
}

/** env 없이 뜬 Storybook 번들 전용 fetch — 호출되면 부트 가드와 같은 메시지로 즉시 실패한다 */
const unconfiguredFetch: typeof fetch = () => {
  throw new Error(MISSING_BASE_URL);
};

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  // 아래 sentinel은 위 fetch 가드 뒤에서만 도달 가능하다(요청이 나가지 않는다).
  // 상대경로 오요청을 막기 위해 절대 URL(예약 TLD `.invalid`)로 둔다.
  baseUrl: baseUrl ?? "http://unconfigured.invalid",
  fetch: baseUrl ? httpClient : unconfiguredFetch,
});
