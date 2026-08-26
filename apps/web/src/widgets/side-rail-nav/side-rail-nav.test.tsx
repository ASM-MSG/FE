import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { useGalleryRegionStore } from "@/features/dex/model/gallery-region-store";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import { useProfileModalStore } from "@/features/profile/model/profile-modal-store";
import { useRegionPanelStore } from "@/features/region/model/region-panel-store";
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

describe("사이드레일 랜드마크 (MSG-478 D3)", () => {
  it("사이드레일 nav에 접근 가능한 이름 '주요 메뉴'가 있다 — 스크린리더 랜드마크 목록에서 구분된다 (D3)", () => {
    useAuthStore.setState({ isAuthenticated: true });
    renderNav("/");

    expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toBeTruthy();
  });
});

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

  // 구 G4 케이스("도감 클릭 시 /dex 이동")는 MSG-328 사용자 버그 리포트로 뒤집힘 —
  // /dex 이동 → RequireAuth 홈 귀환 → MapHomePage 재마운트가 실패 쿼리(grids·hotzones·
  // reissue 401)를 재발사시켰다. 도감도 프로필과 같은 G1 분기(모달만, URL 불변)로 고정한다.
  it("로그아웃 상태 도감 클릭은 이동 대신 로그인 모달만 열린다 — URL 불변 (사용자 버그 리포트, G1 확장)", () => {
    useAuthStore.setState({ isAuthenticated: false });
    renderNav("/");

    fireEvent.click(screen.getByRole("button", { name: "도감" }));

    expect(useLoginModalStore.getState().open).toBe(true);
    expect(screen.getByTestId("location").textContent).toBe("/");
  });

  it("로그인 상태 도감 클릭은 기존대로 /dex 이동 — 모달 안 뜸 (G4 보존)", () => {
    renderNav("/");

    fireEvent.click(screen.getByRole("button", { name: "도감" }));

    expect(screen.getByTestId("location").textContent).toBe("/dex");
    expect(useLoginModalStore.getState().open).toBe(false);
  });
});

/**
 * 활성 탭 재클릭 2단 동작 (MSG-403 AC 17·18) — 판정 규칙 자체는 rail-action 유닛이 덮고,
 * 여기서는 "무엇이 초기화되고 언제 접히는가"의 배선만 고정한다.
 */
describe("활성 탭 재클릭 — 초기화 → 접기 (AC 17·18)", () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: true });
    useSidebarStore.setState({ collapsed: false });
    useThemeFilterStore.setState({ activeTheme: null });
    useHomeCellDetailStore.setState({ selectedCellId: null });
    useProfileModalStore.setState({ open: null });
    useGalleryRegionStore.setState({ selected: null });
    useRegionPanelStore.setState(useRegionPanelStore.getInitialState(), true);
  });

  it("칩이 켜진 홈에서 홈을 누르면 칩·상세만 닫히고 패널은 열려 있다 (AC 17)", () => {
    useThemeFilterStore.setState({ activeTheme: "hot" });
    useHomeCellDetailStore.setState({ selectedCellId: "39064_112221" });
    renderNav("/");

    fireEvent.click(screen.getByRole("button", { name: "홈" }));

    expect(useThemeFilterStore.getState().activeTheme).toBeNull();
    expect(useHomeCellDetailStore.getState().selectedCellId).toBeNull();
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it("초기 상태의 홈에서 홈을 누르면 종전대로 패널이 접힌다 (AC 17)", () => {
    renderNav("/");

    fireEvent.click(screen.getByRole("button", { name: "홈" }));

    expect(useSidebarStore.getState().collapsed).toBe(true);
  });

  it("모달이 열린 프로필에서 프로필을 누르면 모달만 닫힌다 (AC 18)", () => {
    useProfileModalStore.setState({ open: "edit" });
    renderNav("/profile");

    fireEvent.click(screen.getByRole("button", { name: "프로필" }));

    expect(useProfileModalStore.getState().open).toBeNull();
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it("동 갤러리를 연 도감에서 도감을 누르면 갤러리에서 빠져나온다 (AC 18)", () => {
    useGalleryRegionStore.setState({
      selected: { regionName: "부전제1동", gridId: "39064_112221" },
    });
    renderNav("/dex");

    fireEvent.click(screen.getByRole("button", { name: "도감" }));

    expect(useGalleryRegionStore.getState().selected).toBeNull();
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });
});
