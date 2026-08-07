import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
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
});
