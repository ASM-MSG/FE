import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { signOutForTest } from "@/test/auth-session";
import { renderWithProviders } from "@/test/render-with-providers";
import { ADMIN_CONSOLE } from "./console-config";
import { ConsoleSidebar } from "./ConsoleSidebar";

/**
 * 콘솔 사이드바 슬롯 비파괴 확장 (MSG-545 AC 11) — 슬롯을 주지 않은 사이드바의 렌더가
 * MSG-541 계약(제목 + 메뉴)에서 달라지지 않음을 고정한다.
 */
const MENU = [
  { key: "status", label: "신청 현황", path: CONSOLE_ROUTES.orgHome },
];

describe("ConsoleSidebar 슬롯 (AC 11)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("슬롯을 주지 않으면 제목과 메뉴만 렌더된다 — 기존 렌더 불변", () => {
    renderWithProviders(
      <ConsoleSidebar
        title="행사 운영자 콘솔"
        items={MENU}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText("행사 운영자 콘솔")).toBeDefined();
    expect(screen.getByRole("button", { name: "신청 현황" })).toBeDefined();
    expect(screen.queryByText("ORG 계정")).toBeNull();
    expect(screen.queryByText("행사 등록 권한")).toBeNull();
  });

  it("header·footer 슬롯을 주면 사이드바에 함께 렌더된다", () => {
    renderWithProviders(
      <ConsoleSidebar
        title="행사 운영자 콘솔"
        items={MENU}
        onSelect={() => {}}
        header={<p>계정 헤더 슬롯</p>}
        footer={<p>권한 안내 슬롯</p>}
      />,
    );

    expect(screen.getByText("계정 헤더 슬롯")).toBeDefined();
    expect(screen.getByText("권한 안내 슬롯")).toBeDefined();
  });

  it("관리자 콘솔 설정에는 슬롯이 없어 운영자 전용 카드가 나타나지 않는다", () => {
    renderWithProviders(
      <ConsoleSidebar
        title={ADMIN_CONSOLE.title}
        items={ADMIN_CONSOLE.menu}
        onSelect={() => {}}
        header={ADMIN_CONSOLE.sidebarHeader}
        footer={ADMIN_CONSOLE.sidebarFooter}
      />,
    );

    expect(screen.getByText("관리자 콘솔")).toBeDefined();
    expect(screen.getByRole("button", { name: "행사 심사" })).toBeDefined();
    expect(screen.queryByText("ORG 계정")).toBeNull();
    expect(screen.queryByText("행사 등록 권한")).toBeNull();
  });
});
