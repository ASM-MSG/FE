import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { KAKAO_CALLBACK_PATH } from "@/app/routes";
import { appOrigin, redirectTo } from "@/shared/navigation";
import { oauthStateStorage, webStorage } from "@/shared/storage";
import { KAKAO_AUTHORIZE_PATH } from "../model/kakao-oauth";
import { AUTH_STORAGE_KEY, useAuthStore } from "../model/auth-store";
import { useLoginModalStore } from "../model/login-modal-store";
import { LoginModal } from "./LoginModal";

// 외부 이동은 어댑터 경유 — jsdom은 location.assign 재정의를 막으므로 어댑터를 목한다
vi.mock("@/shared/navigation", () => ({
  redirectTo: vi.fn(),
  appOrigin: () => "http://localhost:5173",
}));

/**
 * 로그인 모달 스모크 (MSG-46 후속 2 G2·G3 + 후속 3 P2 — login-page.smoke 관례).
 * 콘텐츠 구성·닫기 계약·카카오 버튼 dev 모의 로그인만 고정한다. 색·간격·카드 형태 등
 * 픽셀 판정은 브라우저 검증의 몫 — 스타일 단정은 넣지 않는다.
 * 모달 열기 진입(SideRail 분기)은 side-rail-nav.test.tsx 몫 (G1).
 * 카카오 버튼은 MSG-325에서 **서버 로그인 진입점으로 이동**하는 계약이 됐다 —
 * 로그인 완결(코드 교환)은 콜백 페이지 소관이라 여기서는 이동과 state 저장만 단정한다.
 */

/** 현재 경로 노출 대역 — 모달 상호작용이 라우팅을 일으키지 않음을 단정하기 위한 관찰 지점 */
const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

const renderModal = () =>
  render(
    // 모달 하위 트리가 쿼리 훅을 쓸 수 있어 프로바이더는 유지한다
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/"]}>
        <LoginModal />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  oauthStateStorage.clear();
  useAuthStore.setState({ accessToken: null, isAuthenticated: false });
  webStorage.removeItem(AUTH_STORAGE_KEY);
});

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
    // 약관 문구는 여전히 플레인 텍스트 — 유일한 링크는 MSG-555 콘솔 진입 링크다
    // (구 페이지 스모크 AC 7 "약관 링크 없음" 계약은 이 형태로 승계된다)
    expect(screen.queryAllByRole("link")).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "운영자 콘솔 로그인 →" }),
    ).toBeTruthy();
  });

  it("하단에 행사 운영자 안내 링크가 보이고 콘솔 로그인으로 이동한다 (MSG-555 AC 1·10)", () => {
    renderModal();

    expect(screen.getByText("행사 운영자이신가요?")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "운영자 콘솔 로그인 →" })
        .getAttribute("href"),
    ).toBe(CONSOLE_ROUTES.orgLogin);
  });

  it("운영자 콘솔 링크를 누르면 로그인 모달이 닫힌다 — 복귀 시 유령 모달 방지 (MSG-555 AC 2)", () => {
    renderModal();

    fireEvent.click(screen.getByRole("link", { name: "운영자 콘솔 로그인 →" }));

    expect(useLoginModalStore.getState().open).toBe(false);
  });

  // codex 리뷰 P2 (2026-09-04): 새 탭 이동은 현재 탭을 그대로 두는 것이 링크의 계약이다.
  // 조건 없이 닫으면 새 탭에서 콘솔이 열리는 동안 원래 탭의 모달만 사라진다 —
  // `Link`를 쓴 이유(우클릭·새 탭 보존)와 정면으로 어긋난다.
  it.each([
    ["Cmd(meta)", { metaKey: true }],
    ["Ctrl", { ctrlKey: true }],
    ["Shift", { shiftKey: true }],
  ])(
    "%s+클릭(새 탭·새 창 이동)에는 현재 탭의 모달이 열린 채 남는다 (MSG-555 AC 2 보수)",
    (_label, modifier) => {
      renderModal();

      fireEvent.click(
        screen.getByRole("link", { name: "운영자 콘솔 로그인 →" }),
        modifier,
      );

      expect(useLoginModalStore.getState().open).toBe(true);
    },
  );

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

  it("카카오 버튼 클릭 → 서버 로그인 진입점으로 이동한다 — 콜백 URI·state 동봉", () => {
    renderModal();

    const button = screen.getByRole("button", { name: "카카오로 계속하기" });
    expect(button.getAttribute("type")).toBe("button");

    fireEvent.click(button);

    expect(vi.mocked(redirectTo)).toHaveBeenCalledTimes(1);
    const url = new URL(vi.mocked(redirectTo).mock.calls[0][0]);
    expect(url.pathname).toBe(KAKAO_AUTHORIZE_PATH);
    expect(url.searchParams.get("redirectUri")).toBe(
      `${appOrigin()}${KAKAO_CALLBACK_PATH}`,
    );

    // state는 콜백에서 대조할 수 있도록 저장돼 있어야 한다 (CSRF)
    const state = url.searchParams.get("state");
    expect(state).toBeTruthy();
    expect(oauthStateStorage.peek()).toBe(state);
  });
});
