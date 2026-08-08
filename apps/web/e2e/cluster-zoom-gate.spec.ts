import { test, expect } from "@playwright/test";
import { stubOccupiedGrids } from "./occupied-grids-stub.js";

/**
 * MSG-264 줄 게이트 회귀 스펙 — 순수 로직(GRID_MIN_ZOOM 임계값 15)은
 * cluster-overlay.test.ts(유닛)가 커버하지만, "실제 네이버 SDK가 줌에 반응해
 * 격자 채움 ↔ 클러스터 마커를 전환 렌더링하는지"는 브라우저 없이 검증 불가능하다.
 *
 * MSG-325: 점령 격자 소스가 목에서 실 API로 바뀌어, 로그인하지 않는 e2e에서는 응답이
 * 비어 클러스터가 생기지 않는다. 네트워크 스텁으로 데이터를 고정해 이 회귀 스펙을 유지한다.
 */
test.describe("격자 채움 ↔ 클러스터 마커 줌 게이트", () => {
  test.beforeEach(async ({ page }) => {
    await stubOccupiedGrids(page);
  });

  test("줌 15(기본) 상태에서는 클러스터 마커가 없다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("status", { name: /지도 축척/ })).toBeVisible({
      timeout: 15_000,
    });

    const clusterMarkers = page.locator('[title*="클러스터"]');
    await expect(clusterMarkers).toHaveCount(0);
  });

  test("줌 15 미만으로 축소하면 클러스터 마커가 나타나고, 다시 확대하면 사라진다", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("status", { name: /지도 축척/ })).toBeVisible({
      timeout: 15_000,
    });

    const zoomOut = page.getByRole("button", { name: "축소" });
    const zoomIn = page.getByRole("button", { name: "확대" });
    const clusterMarkers = page.locator('[title*="클러스터"]');

    await zoomOut.click();
    await zoomOut.click();
    await expect(clusterMarkers.first()).toBeVisible({ timeout: 10_000 });
    await expect(clusterMarkers.first()).toHaveAttribute(
      "title",
      /^격자 \d+개 클러스터$/,
    );

    await zoomIn.click();
    await zoomIn.click();
    await expect(clusterMarkers).toHaveCount(0);
  });
});
