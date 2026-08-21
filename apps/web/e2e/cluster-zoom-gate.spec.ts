import { test, expect } from "@playwright/test";
import { seedLoggedInSession } from "./auth-session-stub.js";
import { stubOccupiedGrids } from "./occupied-grids-stub.js";

/**
 * MSG-264 줌 게이트 회귀 스펙 → MSG-410 서버 집계 전환 개정.
 * 순수 로직(줌→unit 매핑·마커 파생)은 aggregation-unit·region-cluster-overlay 유닛이
 * 커버하지만, "실제 네이버 SDK가 줌에 반응해 격자 채움 ↔ 집계 마커를 전환 렌더링하는지"는
 * 브라우저 없이 검증 불가능하다.
 *
 * MSG-410: 마커 소스가 FE 로컬 산술(`/api/grids` 윈도 스냅)에서 서버 집계
 * (`/api/grids/aggregation`)로 바뀌었다 — 스텁·셀렉터를 새 계약(지역명+점령 격자 수,
 * title "{이름} 점령 격자 N개")으로 갱신. 로그인 시딩은 집계 쿼리 인증 게이트 활성화용.
 */
test.describe("격자 채움 ↔ 지역 집계 마커 줌 게이트", () => {
  test.beforeEach(async ({ page }) => {
    await seedLoggedInSession(page);
    await stubOccupiedGrids(page);
  });

  test("줌 16(기본) 상태에서는 집계 마커가 없다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("status", { name: /지도 축척/ })).toBeVisible({
      timeout: 15_000,
    });

    const aggregationMarkers = page.locator('[title*="점령 격자"]');
    await expect(aggregationMarkers).toHaveCount(0);
  });

  test("줌 16 미만으로 축소하면 동 이름+개수 마커가 나타나고, 다시 확대하면 사라진다", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("status", { name: /지도 축척/ })).toBeVisible({
      timeout: 15_000,
    });

    const zoomOut = page.getByRole("button", { name: "축소" });
    const zoomIn = page.getByRole("button", { name: "확대" });
    const aggregationMarkers = page.locator('[title*="점령 격자"]');

    // 1단 축소 = 줌 15(축척 250m) — 게이트 경계값이자 동(DONG) 단위 구간. 게이트가
    // 틀어지면 여기서 채움이 유지되거나 마커가 없어 실패한다
    await zoomOut.click();
    await expect(aggregationMarkers.first()).toBeVisible({ timeout: 10_000 });
    // 새 마커 계약: 서버 집계 지역명 + 점령 격자 수 (스텁 DONG 항목 = 부전2동 9개)
    await expect(aggregationMarkers.first()).toHaveAttribute(
      "title",
      "부전2동 점령 격자 9개",
    );

    await zoomIn.click();
    await expect(aggregationMarkers).toHaveCount(0);
  });
});
