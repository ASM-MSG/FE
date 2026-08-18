/**
 * MSG-419 (스펙 리스크 2) — 웹 생성 SDK 공유의 **타입 측 부수효과** 보정.
 *
 * metro/vitest는 생성물의 `'../client-config'` 해석을 모바일 구현으로 치환하지만, TS는
 * 상대 import를 치환할 수 없어 웹 `client-config.ts`(=`import.meta.env.VITE_API_BASE_URL`)가
 * 모바일 TS 프로그램에 딸려 들어온다. 런타임에는 이 파일이 번들되지 않으므로
 * (metro resolveRequest가 배제) 타입만 최소로 채워 typecheck를 통과시킨다.
 * 웹 체인의 나머지(localStorage 등)는 expo tsconfig.base의 lib "DOM"으로 이미 해결된다.
 *
 * 이 선언은 apps/mobile TS 프로그램에만 적용된다 — 웹은 vite/client 타입을 그대로 쓴다.
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
