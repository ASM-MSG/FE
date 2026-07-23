import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { useSidebarStore } from "@/widgets/map-shell/sidebar-store";
import { SideRailNav } from "./SideRailNav";

/**
 * SideRail 프로필 분기 유닛 (MSG-46 후속 F4 + 후속 2 G1·G4).
 * 후속 1의 F3(로그아웃 → /login 이동)은 후속 2의 G1(로그인 모달 열기, URL 불변)로
 * 대체되었다 — 이동 단정 대신 모달 스토어 열림을 단정한다.
 * 모달 자체의 렌더·닫기·콘텐츠는 login-modal.smoke.test.tsx 몫.
 */

/** 현재 경로 노출 대역 — 모달 분기가 라우팅을 일으키지 않음을 단정하기 위한 관찰 지점 */
const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

const renderNav = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SideRailNav />
      <Routes>
        <Route path="*" element={null} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );

afterEach(cleanup);

describe("SideRail 프로필 분기", () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: true });
    useLoginModalStore.setState({ open: false });
    useSidebarStore.setState({ collapsed: false });
  });

  it("로그아웃 상태에서 프로필 클릭 시 /login 이동 대신 로그인 모달이 열린다 — URL 불변 (G1)", () => {
    useAuthStore.setState({ isAuthenticated: false });
    renderNav("/");

    fireEvent.click(screen.getByRole("button", { name: "프로필" }));

    expect(useLoginModalStore.getState().open).toBe(true);
    expect(screen.getByTestId("location").textContent).toBe("/");
  });

  it("로그아웃 상태 /profile(활성 탭 재클릭)에서도 접기 토글 대신 모달이 열린다 (G1, 분기 우선순위)", () => {
    useAuthStore.setState({ isAuthenticated: false });
    renderNav("/profile");

    fireEvent.click(screen.getByRole("button", { name: "프로필" }));

    expect(useLoginModalStore.getState().open).toBe(true);
    // 활성 탭 토글로 빠지지 않는다 — 사이드바 접힘 오폭 없음
    expect(useSidebarStore.getState().collapsed).toBe(false);
    expect(screen.getByTestId("location").textContent).toBe("/profile");
  });

  it("로그인 상태에서 프로필 클릭은 기존대로 /profile 이동 — 모달이 열리지 않는다 (G4)", () => {
    renderNav("/");

    fireEvent.click(screen.getByRole("button", { name: "프로필" }));

    expect(screen.getByTestId("location").textContent).toBe("/profile");
    expect(useLoginModalStore.getState().open).toBe(false);
  });

  it("로그아웃 상태의 타 탭 이동은 영향 없다 — 도감 클릭 시 /dex 이동, 모달 안 뜸 (G4)", () => {
    useAuthStore.setState({ isAuthenticated: false });
    renderNav("/");

    fireEvent.click(screen.getByRole("button", { name: "도감" }));

    expect(screen.getByTestId("location").textContent).toBe("/dex");
    expect(useLoginModalStore.getState().open).toBe(false);
  });
});
