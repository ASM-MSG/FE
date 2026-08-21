import { defineConfig } from "@hey-api/openapi-ts";

/**
 * hey-api 코드젠 설정 — 백엔드 OpenAPI 명세를 타입·SDK·TanStack Query 정본으로 삼는다.
 * (MSG-289 타입 전용 → MSG-323에서 호출 스택 전체로 확장)
 *
 * [명세 스냅샷과 재생성 절차]
 * 1. 명세 갱신: `curl -sS -o openapi/api-docs.json https://api.fillmap.kr/v3/api-docs`
 *    (apps/web에서 실행. 원문 그대로 저장 — jq 등으로 재정렬하지 않는다)
 * 2. 재생성: 루트에서 `pnpm openapi-ts` → `src/shared/api/generated/` 갱신
 * 3. `pnpm typecheck`로 목(entities/*)-명세 불일치를 확인하고 정렬 후 스냅샷·생성물을 함께 커밋
 *
 * 입력이 커밋된 로컬 스냅샷이라 백엔드 없이도 재생성·typecheck·build가 성립하고,
 * 같은 스냅샷이면 재생성 결과가 결정적이다(git diff 0 — CI가 드리프트를 검사한다).
 * 생성물(generated/)은 수기 수정 금지 — 수기 코드(Ky·config·헬퍼)는 전부 generated/ 밖에 둔다.
 *
 * [플러그인 구성 (MSG-323)]
 * - @hey-api/typescript: 명세 타입 (types.gen.ts)
 * - @hey-api/sdk: 오퍼레이션별 호출 함수 (sdk.gen.ts)
 * - @hey-api/client-fetch: fetch 클라이언트 — 0.73+부터 openapi-ts에 번들되어 별도 패키지
 *   설치 금지(deprecated). runtimeConfigPath의 createClientConfig(shared/api/client-config.ts)가
 *   baseUrl과 Ky 기반 fetch를 주입한다.
 * - @tanstack/react-query: queryOptions·mutationOptions·queryKeys (@tanstack/react-query.gen.ts).
 *   barrel(index.ts)에 재수출되지 않으므로(includeInEntry 기본 false) 도메인 티켓은
 *   `shared/api/generated/@tanstack/react-query.gen`에서 직접 import한다 (스펙 질문 7 승인).
 */
export default defineConfig({
  input: "./openapi/api-docs.json",
  output: "src/shared/api/generated",
  plugins: [
    "@hey-api/typescript",
    "@hey-api/sdk",
    {
      name: "@hey-api/client-fetch",
      runtimeConfigPath: "./src/shared/api/client-config",
    },
    {
      name: "@tanstack/react-query",
      mutationOptions: true,
      queryKeys: true,
      queryOptions: true,
    },
  ],
});
