import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webStorage } from "@/shared/storage";
import { AUTH_STORAGE_KEY, useAuthStore } from "../model/auth-store";
import { useLoginModalStore } from "../model/login-modal-store";
import { LoginModal } from "./LoginModal";

/**
 * 로그인 모달 스모크 (MSG-46 후속 2 G2·G3 + 후속 3 P2 — login-page.smoke 관례).
 * 콘텐츠 구성·닫기 계약·카카오 버튼 dev 모의 로그인만 고정한다. 색·간격·카드 형태 등
 * 픽셀 판정은 브라우저 검증의 몫 — 스타일 단정은 넣지 않는다.
 * 모달 열기 진입(SideRail 분기)은 side-rail-nav.test.tsx 몫 (G1).
 * 카카오 버튼이 MSG-324에서 목 로그인 → dev 모의 로그인 API로 배선돼 네트워크를 탄다 —
 * fetch 목 + QueryClientProvider 보강 (클릭 계약 자체는 승계: 로그인 상태 + 모달 닫힘).
 */

/** 현재 경로 노출 대역 — 모달 상호작용이 라우팅을 일으키지 않음을 단정하기 위한 관찰 지점 */
const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

const renderModal = () =>
  render(
    // KakaoLoginButton의 useDevSocialLogin(useMutation)이 QueryClient를 요구한다 (MSG-324)
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
  // 카카오 버튼 케이스가 실토큰을 저장하므로 스토어·스토리지를 비로그인으로 되돌린다
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

  it("카카오 버튼 클릭 → dev 모의 로그인 요청, 성공 시 로그인 상태 + 모달 닫힘 — URL 불변 (MSG-324 기준 11, 구 P2 목 로그인 대체)", async () => {
    useAuthStore.setState({ accessToken: null, isAuthenticated: false });
    const fetchMock = vi.fn<(input: Request) => Promise<Response>>(
      async () =>
        new Response(
          JSON.stringify({
            developCode: 0,
            message: "ok",
            data: { accessToken: "dev-access-token", refreshToken: null },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderModal();

    const button = screen.getByRole("button", { name: "카카오로 계속하기" });
    expect(button.getAttribute("type")).toBe("button");

    fireEvent.click(button);

    // dev 모의 로그인일 뿐 실 카카오 OIDC 아님 — 인가 리다이렉트 없음 (스펙 오탐 방지)
    await waitFor(() => expect(useLoginModalStore.getState().open).toBe(false));
    const [requested] = fetchMock.mock.calls[0];
    expect(new URL(requested.url).pathname).toBe("/api/auth/dev/social-login");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("location").textContent).toBe("/");
  });
});
