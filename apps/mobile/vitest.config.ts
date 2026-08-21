import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vitest/config";

/**
 * apps/mobile 테스트는 순수 모델(RN import 없는 로직)로 한정한다 — MSG-292 확정 4.
 * RN 컴포넌트 렌더 테스트 인프라(jest-expo·RNTL)는 도입하지 않는다.
 */

const mobileClientConfig = fileURLToPath(
  new URL("./src/shared/api/client-config.ts", import.meta.url),
);

/**
 * MSG-419: 웹 생성물 `client.gen.ts`가 정적 import하는 `'../client-config'`를 모바일
 * client-config로 치환한다 — metro.config.js의 `resolver.resolveRequest`와 **같은 규칙**을
 * 테스트 러너에 재현한 것(런타임과 테스트가 같은 배선을 타야 파이프라인 단정이 의미를 갖는다).
 * 치환하지 않으면 웹 client-config → 웹 http-client → localStorage 체인이 딸려 온다.
 */
const webClientConfigRedirect: Plugin = {
  name: "fillmap:mobile-client-config-redirect",
  enforce: "pre",
  resolveId(source, importer) {
    if (
      source === "../client-config" &&
      importer?.includes("/apps/web/src/shared/api/generated/")
    ) {
      return mobileClientConfig;
    }
    return null;
  },
};

export default defineConfig({
  plugins: [webClientConfigRedirect],
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
