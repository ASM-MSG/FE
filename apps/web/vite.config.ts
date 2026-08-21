import { readFileSync } from "node:fs";
import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// 앱 버전 주입 소스 — package.json version (MSG-329 A5, MOCK "1.0.0" 하드코딩 대체)
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version: string };

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ffmpeg.wasm은 자체 워커·코어를 패키지 상대 URL로 로드한다 — dep 사전 번들을 타면
  // 워커 경로가 깨지므로 제외한다 (지연 로드 dynamic import라 초기 번들 영향 없음, MSG-329)
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg"],
  },
  define: {
    // MSG-329 A5: 앱 버전 빌드 주입. vitest(mode=test)는 센티널 — 테스트가 실버전에 결합하지 않게
    __APP_VERSION__: JSON.stringify(mode === "test" ? "0.0.0-test" : version),
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    // 기본값은 !CI라 로컬 pnpm test만 .only를 허용 — CI와 게이트 동작 통일
    allowOnly: false,
    // MSG-324: auth 훅 테스트가 생성 클라이언트(client-config의 env 가드)를 정적 import한다 —
    // .env.local이 없는 CI에서도 모듈 로드가 통과하도록 센티널 주입 (playwright.config 선례).
    // 테스트의 URL 단정은 pathname 기준이라 값 자체에는 의존하지 않는다.
    env: {
      VITE_API_BASE_URL: "http://api.vitest.sentinel",
    },
  },
}));
