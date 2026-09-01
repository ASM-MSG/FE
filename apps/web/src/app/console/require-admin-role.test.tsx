import { screen, waitFor } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { consoleSessionFetch } from "@/test/console-session";
import { renderWithProviders } from "@/test/render-with-providers";
import { RequireAdminRole } from "./RequireAdminRole";

/**
 * 관리자 콘솔 가드 (AC 8) — ADMIN이 아닌 모든 세션(비로그인 포함, 추정 2)에 대해
 * 기존 404 화면과 같은 외형으로 위장 렌더하고 URL을 그대로 둔다. 콘솔의 존재도,
 * 로그인 유도도 노출하지 않는다.
 */
const CurrentPath = () => <p>현재 경로: {useLocation().pathname}</p>;

const renderGuard = () =>
  renderWithProviders(
    <Routes>
      <Route
        path={CONSOLE_ROUTES.adminReview}
        element={
          <>
            <CurrentPath />
            <RequireAdminRole>
              <p>관리자 콘솔 본문</p>
            </RequireAdminRole>
          </>
        }
      />
      <Route path={CONSOLE_ROUTES.orgLogin} element={<p>콘솔 로그인 화면</p>} />
    </Routes>,
    CONSOLE_ROUTES.adminReview,
  );

describe("RequireAdminRole — 관리자 콘솔 은닉 가드 (AC 8)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("ADMIN 세션은 보호 본문을 렌더한다 (AC 8)", async () => {
    signInForTest();
    consoleSessionFetch("ADMIN");

    renderGuard();

    expect(await screen.findByText("관리자 콘솔 본문")).toBeDefined();
  });

  it("ORG 세션은 404 화면과 동일 외형으로 위장 렌더되고 URL이 유지된다 (AC 8)", async () => {
    signInForTest();
    consoleSessionFetch("ORG");

    renderGuard();

    expect(
      await screen.findByRole("heading", { name: "문제가 생겼어요" }),
    ).toBeDefined();
    expect(screen.getByText("현재 경로: /admin/review")).toBeDefined();
    expect(screen.queryByText("관리자 콘솔 본문")).toBeNull();
    expect(screen.queryByText("콘솔 로그인 화면")).toBeNull();
  });

  it("USER 세션도 404 위장이다 (AC 8)", async () => {
    signInForTest();
    consoleSessionFetch("USER");

    renderGuard();

    expect(
      await screen.findByRole("heading", { name: "문제가 생겼어요" }),
    ).toBeDefined();
  });

  it("비로그인도 로그인 유도 없이 404 위장이다 — 콘솔 존재 은닉 (추정 2)", async () => {
    signOutForTest();
    consoleSessionFetch("ADMIN");

    renderGuard();

    expect(
      await screen.findByRole("heading", { name: "문제가 생겼어요" }),
    ).toBeDefined();
    expect(screen.queryByText("콘솔 로그인 화면")).toBeNull();
  });

  it("role 확정 전에는 위장 화면도 본문도 렌더하지 않는다 (AC 8 — 자리표시)", async () => {
    signInForTest();
    consoleSessionFetch("ADMIN");

    renderGuard();

    expect(
      screen.queryByRole("heading", { name: "문제가 생겼어요" }),
    ).toBeNull();
    await waitFor(() =>
      expect(screen.getByText("관리자 콘솔 본문")).toBeDefined(),
    );
  });
});
