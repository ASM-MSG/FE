import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * apps/mobile 테스트는 순수 모델(RN import 없는 로직)로 한정한다 — MSG-292 확정 4.
 * RN 컴포넌트 렌더 테스트 인프라(jest-expo·RNTL)는 도입하지 않는다.
 */
export default defineConfig({
  resolve: {
    alias: {
      // parity 테스트의 웹 원본 동적 import 전용 (MSG-296) — 웹 소스 내부의
      // "@/…" 별칭(웹 vite alias)을 모바일 러너에서도 해석한다.
      // 모바일 소스는 "@" 별칭을 쓰지 않으므로 자체 해석에는 영향 없다.
      "@": fileURLToPath(new URL("../web/src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // 기본값은 !CI라 로컬 pnpm test만 .only를 허용 — CI와 게이트 동작 통일 (웹 선례)
    allowOnly: false,
  },
});
