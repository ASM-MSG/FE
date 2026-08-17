import { expect, test } from "@playwright/test";

/**
 * 온보딩 동의 게이트 — popstate 방향 판별 실브라우저 회귀 (MSG-407 기준 1·2, codex P1).
 * vitest 스모크(app-layout-consent-gate)는 메모리 라우터라 실브라우저 히스토리
 * 의미론(react-router가 history.state.idx에 심는 단조 증가 인덱스, same-document
 * 트래버설의 popstate 발화)을 재현하지 못한다 — 이 스펙이 그 층을 고정한다.
 * (page-verifier 검증 하네스에서 승격 — MSG-407 6차 회차)
 *
 * 흐름: 로그인+동의(true)로 SPA 이동해 라우터 idx 엔트리를 쌓고 → 뒤로가기로
 * forward 이력을 만든 뒤 → 동의 false로 전환·리로드해 게이트 표시 →
 * ① 앞으로가기 = 로그아웃 미발사·게이트 유지(P1) → ② 이어지는 뒤로가기 =
 * 로그인 중단(다단 판별 — 마지막 관찰 idx) + 팝된 URL 익명 렌더.
 */
test("게이트 앞으로가기는 무시되고, 이후 뒤로가기는 로그인 중단이다 (P1 방향 판별 실측)", async ({
  page,
}) => {
  let consented = true;
  let logoutCalls = 0;

  await page.addInitScript(() => {
    localStorage.setItem(
      "fillmap-auth",
      JSON.stringify({ state: { accessToken: "e2e-access-token" }, version: 1 }),
    );
  });
  await page.route("**/api/users/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        developCode: 0,
        message: "성공",
        data: {
          email: null,
          nickname: "e2e필맵퍼",
          profileImageUrl: null,
          createdAt: "2026-01-12T00:00:00Z",
          locationConsent: consented,
        },
      }),
    }),
  );
  await page.route("**/api/auth/logout", (route) => {
    logoutCalls += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ developCode: 0, message: "성공", data: null }),
    });
  });

  const gateHeading = page.getByRole("heading", { name: "위치정보 이용 동의" });

  // 1) 동의 상태로 라우터 히스토리 구축: "/"(idx 0) → SPA push "/dex"(idx 1)
  await page.goto("/");
  await expect(gateHeading).toHaveCount(0);
  await page.getByRole("button", { name: "도감" }).click();
  await expect(page).toHaveURL(/\/dex$/);
  // 라우터가 엔트리에 idx를 심는지 실측 (P1 전제 — builder의 7.18.1 관찰 교차 확인)
  expect(
    // tsconfig.node(e2e)는 DOM lib이 없다 — 브라우저 컨텍스트 전역은 globalThis 캐스트로 접근
    await page.evaluate(
      () =>
        (globalThis as { history?: { state?: { idx?: number } | null } })
          .history?.state?.idx,
    ),
  ).toBe(1);

  // 2) 뒤로가기로 forward 이력 생성: 현재 "/"(idx 0), forward = "/dex"(idx 1)
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);

  // 3) 동의 false 전환 + 리로드 → 게이트 표시 (히스토리 위치·forward 이력 보존)
  consented = false;
  await page.reload();
  await expect(gateHeading).toBeVisible();

  // 4) 앞으로가기 → 로그아웃 미발사·게이트 유지 (P1: forward 무시, 게이트 재렌더)
  await page.goForward();
  await expect(page).toHaveURL(/\/dex$/);
  await expect(gateHeading).toBeVisible();
  await page.waitForTimeout(300);
  expect(logoutCalls).toBe(0);

  // 5) 이어지는 뒤로가기 → 로그인 중단 (다단 판별: 마지막 관찰 idx 1 → 0)
  //    팝된 "/"가 익명으로 렌더되고(게이트·세션 해제) 추가 이동은 없다
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(gateHeading).toHaveCount(0);
  await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
  await expect
    .poll(() => logoutCalls, { timeout: 3000 })
    .toBe(1);
  // 익명 전환 확증 — 로컬 세션 해제(onSettled)
  expect(
    await page.evaluate(() => {
      const raw = localStorage.getItem("fillmap-auth");
      if (!raw) return null;
      return (JSON.parse(raw) as { state?: { accessToken?: string | null } })
        .state?.accessToken ?? null;
    }),
  ).toBeNull();
});
