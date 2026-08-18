/**
 * 생성 SDK 재수출 barrel (AC 2) — 모바일은 hey-api 생성물을 **재생성하지 않고** 웹의
 * `apps/web/src/shared/api/generated`를 그대로 공유한다(티켓 명시).
 *
 * 크로스 앱 상대 경로를 이 파일과 `query-options.ts` 두 곳에만 둔다 — 하류 티켓
 * (MSG-422~431)은 여기서만 import하므로, 웹 생성물 경로가 바뀌어도 고칠 곳이 두 파일이다.
 *
 * 런타임 결합: `client` 값은 초기화 시 `client.gen.ts`가 정적 import하는
 * `'../client-config'`를 호출한다. 모바일 번들에서는 metro의 `resolver.resolveRequest`가
 * 그 요청을 모바일 `client-config.ts`로 치환해(웹 http-client·localStorage 체인 배제)
 * 모바일 Ky 인스턴스가 주입된다 (metro.config.js / vitest.config.ts에 같은 규칙).
 */
export * from "../../../../web/src/shared/api/generated";
export { client } from "../../../../web/src/shared/api/generated/client.gen";
export type { CreateClientConfig } from "../../../../web/src/shared/api/generated/client.gen";
