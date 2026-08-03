import { MemoryRouter, useLocation } from "react-router-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "../model/auth-store";
import { useLoginModalStore } from "../model/login-modal-store";
import { LoginModal } from "./LoginModal";

/**
 * 로그인 모달 스모크 (MSG-46 후속 2 G2·G3 + 후속 3 P2 — login-page.smoke 관례).
 * 콘텐츠 구성·닫기 계약·카카오 버튼 목 로그인만 고정한다. 색·간격·카드 형태 등
 * 픽셀 판정은 브라우저 검증의 몫 — 스타일 단정은 넣지 않는다.
 * 모달 열기 진입(SideRail 분기)은 side-rail-nav.test.tsx 몫 (G1).
 */

/** 현재 경로 노출 대역 — 모달 상호작용이 라우팅을 일으키지 않음을 단정하기 위한 관찰 지점 */
const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

const renderModal = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <LoginModal />
      <LocationProbe />
    </MemoryRouter>,
  );

afterEach(cleanup);

describe("로그인 모달 스모크", () => {
  beforeEach(() => {
    useLoginModalStore.setState({ open: true });
  });

  it("로그인 페이지와 동일 콘텐츠 구성이 모두 보인다 — 타이틀·서브카피·로고·태그라인·SNS 안내·카카오 버튼·약관 (G2)", () => {
    renderModal();

    expect(screen.getByRole("dialog", { name: "필맵에 로그인" })).toBeTruthy();
    // 가시 타이틀은 h2 — 베이스 화면의 h1과 충돌하지 않는다
    expect(
      screen.getByRole("heading", { name: "필맵에 로그인", level: 2 }),
    ).toBeTruthy();
    expect(screen.getByText("빠르고 간편하게 시작하세요")).toBeTruthy();
    expect(screen.getByRole("img", { name: "필맵 로고" })).toBeTruthy();
    expect(screen.getByText("기록하고, 모으고, 탐험하는 지도")).toBeTruthy();
    expect(screen.getByText("SNS 계정으로 간편하게 시작해요")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "카카오로 계속하기" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "로그인 시 서비스 약관과 개인정보 처리 방침에 동의합니다",
      ),
    ).toBeTruthy();
    // 약관 문구는 플레인 텍스트 — 링크 연결은 제외 범위 (구 페이지 스모크 AC 7 계약 승계)
    expect(screen.queryAllByRole("link")).toEqual([]);
  });

  it("✕ 버튼으로 닫힌다 — 원래 화면 그대로, URL 불변 (G3)", () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(useLoginModalStore.getState().open).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("location").textContent).toBe("/");
  });

  it("Esc로 닫힌다 — 기존 모달 관례(Radix) 유지 (G3)", () => {
    renderModal();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(useLoginModalStore.getState().open).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("카카오 버튼 클릭 → 목 로그인(상태 true) + 모달 닫힘 — URL 불변 (P2, G5 '무동작' 대체)", () => {
    useAuthStore.setState({ isAuthenticated: false });
    renderModal();

    const button = screen.getByRole("button", { name: "카카오로 계속하기" });
    expect(button.getAttribute("type")).toBe("button");

    fireEvent.click(button);

    // 목 로그인일 뿐 실제 OAuth 아님 — 인가 리다이렉트·토큰 없음 (스펙 오탐 방지)
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useLoginModalStore.getState().open).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("location").textContent).toBe("/");
  });
});
