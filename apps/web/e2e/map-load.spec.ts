import { test, expect } from "@playwright/test";

/**
 * 네이버 지도 SDK 실 로딩 회귀 스펙 — jsdom(vitest)에서는 SDK가 렌더링되지 않아
 * 유닛/통합 테스트로 커버 불가능한 영역. VITE_NAVER_MAP_NCP_KEY_ID가
 * http://localhost:5173 웹 서비스 URL로 등록되어 있어야 통과한다 (.env.example 참고).
 */
test("지도가 정상 로딩되고 초기 축척 배지가 표시된다", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("지도를 불러오지 못했어요")).not.toBeVisible();

  const scaleBadge = page.getByRole("status", { name: /지도 축척/ });
  await expect(scaleBadge).toBeVisible({ timeout: 15_000 });
  await expect(scaleBadge).toHaveAttribute("aria-label", "지도 축척 250m");
});
