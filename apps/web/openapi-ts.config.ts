import { defineConfig } from "@hey-api/openapi-ts";

/**
 * hey-api 코드젠 설정 (MSG-289) — 백엔드 OpenAPI 명세를 타입 정본으로 삼는다.
 *
 * [명세 스냅샷과 재생성 절차]
 * 1. 명세 갱신: `curl -sS -o openapi/api-docs.json https://api.fillmap.kr/v3/api-docs`
 *    (apps/web에서 실행. 원문 그대로 저장 — jq 등으로 재정렬하지 않는다)
 * 2. 재생성: 루트에서 `pnpm openapi-ts` → `src/shared/api/generated/`에 types.gen.ts 갱신
 * 3. `pnpm typecheck`로 목(entities/*)-명세 불일치를 확인하고 정렬 후 스냅샷·생성물을 함께 커밋
 *
 * 입력이 커밋된 로컬 스냅샷이라 백엔드 없이도 재생성·typecheck·build가 성립하고,
 * 같은 스냅샷이면 재생성 결과가 결정적이다(git diff 0).
 *
 * 플러그인은 타입 전용(@hey-api/typescript) — 실제 API 호출 연동(sdk·client·React Query)은
 * 후속 티켓에서 플러그인 추가로 확장한다 (스펙 추정 1 승인).
 */
export default defineConfig({
  input: "./openapi/api-docs.json",
  output: "src/shared/api/generated",
  plugins: ["@hey-api/typescript"],
});
