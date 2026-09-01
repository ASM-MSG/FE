import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { consoleSessionFetch } from "@/test/console-session";
import { renderWithProviders } from "@/test/render-with-providers";
import { RequireOrgRole } from "./RequireOrgRole";

/**
 * 운영자 콘솔 가드 (AC 7·9) — 비로그인·USER는 콘솔 로그인으로 회송하고, 콘솔 세션
 * (ORG·ADMIN — mustChange 게이트 착지가 `/org/password/setup` 공용이라 ADMIN도 통과
 * 대상이다)은 보호 본문을 렌더한다. mustChange 게이트 자체는 use-must-change-gate.test가 고정.
 */
const renderGuard = () =>
  renderWithProviders(
    <Routes>
      <Route
        path={CONSOLE_ROUTES.orgHome}
        element={
          <RequireOrgRole>
            <p>운영자 콘솔 본문</p>
          </RequireOrgRole>
        }
      />
      <Route path={CONSOLE_ROUTES.orgLogin} element={<p>콘솔 로그인 화면</p>} />
    </Routes>,
    CONSOLE_ROUTES.orgHome,
  );

describe("RequireOrgRole — 운영자 콘솔 보호 라우트 가드 (AC 7)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("비로그인으로 보호 라우트에 진입하면 /org/login으로 보내진다 (AC 7)", async () => {
    signOutForTest();
    consoleSessionFetch("USER");

    renderGuard();

    expect(await screen.findByText("콘솔 로그인 화면")).toBeDefined();
    expect(screen.queryByText("운영자 콘솔 본문")).toBeNull();
  });

  it("USER role 세션은 /org/login으로 회송된다 (추정 3)", async () => {
    signInForTest();
    consoleSessionFetch("USER");

    renderGuard();

    expect(await screen.findByText("콘솔 로그인 화면")).toBeDefined();
  });

  it("ORG role 세션은 보호 본문을 렌더한다 (AC 7)", async () => {
    signInForTest();
    consoleSessionFetch("ORG");

    renderGuard();

    expect(await screen.findByText("운영자 콘솔 본문")).toBeDefined();
  });

  it("ADMIN role 세션도 통과한다 — mustChange 착지(/org/password/setup)가 콘솔 공용이다 (질문 8 확정)", async () => {
    signInForTest();
    consoleSessionFetch("ADMIN");

    renderGuard();

    expect(await screen.findByText("운영자 콘솔 본문")).toBeDefined();
  });

  it("role 확정 전에는 보호 본문도 로그인 화면도 렌더하지 않는다 (AC 7 — 자리표시)", async () => {
    signInForTest();
    consoleSessionFetch("ORG");

    renderGuard();

    expect(screen.queryByText("운영자 콘솔 본문")).toBeNull();
    expect(screen.queryByText("콘솔 로그인 화면")).toBeNull();
    await waitFor(() =>
      expect(screen.getByText("운영자 콘솔 본문")).toBeDefined(),
    );
  });
});
