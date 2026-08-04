import { defineConfig } from "vitest/config";

/**
 * apps/mobile 테스트는 순수 모델(RN import 없는 로직)로 한정한다 — MSG-292 확정 4.
 * RN 컴포넌트 렌더 테스트 인프라(jest-expo·RNTL)는 도입하지 않는다.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // 기본값은 !CI라 로컬 pnpm test만 .only를 허용 — CI와 게이트 동작 통일 (웹 선례)
    allowOnly: false,
  },
});
