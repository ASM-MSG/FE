import { fireEvent, screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { consoleSessionFetch } from "@/test/console-session";
import { renderWithProviders } from "@/test/render-with-providers";
import { ADMIN_CONSOLE, ORG_CONSOLE } from "./console-config";
import { ConsoleShell } from "./ConsoleShell";

/**
 * 콘솔 셸 스모크 (AC 4·5) — 레일·사이드바 메뉴 클릭 이동 + 활성 강조 + 레일 하단
 * 로그아웃 배선만 고정한다. 본문은 후속 티켓이 채우므로 자리표시 텍스트를 단정하지 않는다.
 */
const renderShell = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route
        path={CONSOLE_ROUTES.orgHome}
        element={<ConsoleShell config={ORG_CONSOLE} />}
      >
        <Route index element={<p>신청 현황 본문</p>} />
        <Route path="settings" element={<p>계정 설정 본문</p>} />
        <Route path="submissions" element={<p>내 신청 목록 본문</p>} />
      </Route>
      <Route path={CONSOLE_ROUTES.orgLogin} element={<p>콘솔 로그인 화면</p>} />
    </Routes>,
    route,
  );

describe("ConsoleShell — 콘솔 공통 셸 (AC 4·5)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("사이드바 메뉴를 클릭하면 그 콘솔 라우트로 이동한다 (AC 5)", () => {
    renderShell(CONSOLE_ROUTES.orgHome);

    fireEvent.click(screen.getByRole("button", { name: "계정 설정" }));

    expect(screen.getByText("계정 설정 본문")).toBeDefined();
  });

  it("현재 경로의 사이드바 항목이 활성 강조된다 (AC 5)", () => {
    renderShell(CONSOLE_ROUTES.orgSettings);

    expect(
      screen
        .getByRole("button", { name: "계정 설정" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen
        .getByRole("button", { name: "신청 현황" })
        .getAttribute("aria-current"),
    ).toBeNull();
  });

  it("레일 섹션을 클릭하면 그 섹션 라우트로 이동한다 (AC 5)", () => {
    renderShell(CONSOLE_ROUTES.orgHome);

    fireEvent.click(screen.getByRole("button", { name: "행사" }));

    expect(screen.getByText("내 신청 목록 본문")).toBeDefined();
  });

  it("레일 하단 로그아웃을 클릭하면 세션이 종료되고 /org/login으로 이동한다 (AC 5)", async () => {
    signInForTest();
    consoleSessionFetch("ORG");
    renderShell(CONSOLE_ROUTES.orgHome);

    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(await screen.findByText("콘솔 로그인 화면")).toBeDefined();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("관리자 변형은 같은 셸에 관리자 제목·메뉴를 싣는다 — 컴포넌트 분기가 아니다 (AC 4)", () => {
    renderWithProviders(
      <Routes>
        <Route
          path={CONSOLE_ROUTES.adminReview}
          element={<ConsoleShell config={ADMIN_CONSOLE} />}
        />
      </Routes>,
      CONSOLE_ROUTES.adminReview,
    );

    expect(screen.getByText("관리자 콘솔")).toBeDefined();
    expect(screen.getByRole("button", { name: "행사 심사" })).toBeDefined();
    expect(screen.getByRole("button", { name: "승인 행사" })).toBeDefined();
  });
});
