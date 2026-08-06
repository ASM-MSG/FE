import { defineConfig, devices } from "@playwright/test";

/**
 * 네이버 지도(NCP) 웹 서비스 URL이 http://localhost:5173로 등록되어 있어
 * 포트를 5173으로 고정한다 (.env.example 참고).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      // 부트 가드(client-config.ts) 충족용 — 없으면 앱이 부트 시점에 throw해 e2e 전체가 백지로 실패한다.
      // 실 백엔드 URL을 넣지 않는 이유: e2e가 백엔드 가용성에 결합되면 안 된다 (MSG-323 결정).
      // 실수로 실 호출이 생기면 이 센티널(리스닝 없는 포트)이 즉시 실패시켜 드러낸다 —
      // API 배선 티켓(MSG-325~)의 e2e는 page.route 목으로 응답을 공급할 것.
      VITE_API_BASE_URL: "http://127.0.0.1:4010",
    },
  },
});
