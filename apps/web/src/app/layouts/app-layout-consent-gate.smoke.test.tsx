import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { AppLayout } from "./AppLayout";

/**
 * 온보딩 동의 게이트 흐름 스모크 (MSG-407 기준 1·2·3·8·11 + v4 뒤로가기 이탈) —
 * 여러 유닛(인증 스토어 + 게이트 훅 + 동의 화면 + 앱 셸)의 협업 결과를 실제 조립으로
 * 검증한다. 게이트는 라우트가 아닌 전면 조건 렌더(추정 1) — AppLayout이 앱 콘텐츠
 * 대신 동의 화면을 렌더한다.
 */

const APP_CONTENT = "앱 홈 콘텐츠";
const DEX_CONTENT = "도감 콘텐츠";
const GATE_TITLE = "위치정보 이용 동의";

const ME = {
  email: null,
  nickname: "필맵퍼",
  profileImageUrl: null,
  createdAt: "2026-05-02T09:00:00",
};

/**
 * getMe·location-consent만 아는 fetch 스텁 — PUT 성공 시 이후 getMe가
 * locationConsent=true를 돌려줘 "캐시 갱신 경유 게이트 해제"(기준 8)를 재현한다.
 */
const stubConsentApi = (initialConsent: boolean) => {
  let consent = initialConsent;
  const fetchMock = vi.fn(async (input: Request) => {
    const { pathname } = new URL(input.url);
    if (pathname === "/api/users/me") {
      return envelopeResponse({ ...ME, locationConsent: consent });
    }
    if (pathname === "/api/users/me/location-consent") {
      consent = ((await input.clone().json()) as { consented: boolean })
        .consented;
      return envelopeResponse({ ...ME, locationConsent: consent });
    }
    return new Response(null, { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

/**
 * 게이트 스모크 하네스 — createMemoryRouter 인스턴스를 돌려줘 push 이동(router.navigate)과
 * 현재 경로 단정에 쓴다 (v4 — 뒤로가기/push 방향 구분 검증). renderWithProviders는
 * RouterProvider를 감쌀 수 없어(내장 MemoryRouter) 여기선 QueryClientProvider만 직접 조립.
 */
const renderShell = () => {
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <div>{APP_CONTENT}</div> },
          { path: "/dex", element: <div>{DEX_CONTENT}</div> },
        ],
      },
    ],
    { initialEntries: ["/"] },
  );
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
};

/** fetch 목에서 logout API 호출만 추린다 — v4 케이스 3곳 공용 단정 재료 */
const logoutCallsOf = (fetchMock: ReturnType<typeof stubConsentApi>) =>
  fetchMock.mock.calls.filter(
    ([request]) => new URL(request.url).pathname === "/api/auth/logout",
  );

beforeEach(() => {
  signOutForTest();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  // 방향 판별 케이스(codex P1)가 심은 히스토리 idx가 다음 케이스로 새지 않게 초기화
  window.history.replaceState(null, "");
});

describe("온보딩 동의 게이트 (MSG-407)", () => {
  it("로그인 + locationConsent=false면 앱 콘텐츠 대신 전면 동의 화면이 렌더된다 (기준 1)", async () => {
    signInForTest();
    stubConsentApi(false);
    renderShell();

    expect(
      await screen.findByRole("heading", { name: GATE_TITLE }),
    ).toBeTruthy();
    expect(screen.queryByText(APP_CONTENT)).toBeNull();
  });

  it("locationConsent=true면 게이트가 나타나지 않고 기존 앱 화면이 그대로 렌더된다 (기준 2)", async () => {
    signInForTest();
    const fetchMock = stubConsentApi(true);
    renderShell();

    expect(await screen.findByText(APP_CONTENT)).toBeTruthy();
    // getMe 조회가 끝난 뒤에도 게이트가 없다
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: GATE_TITLE })).toBeNull();
  });

  it("비로그인 상태에서는 게이트가 나타나지 않고 getMe를 발사하지 않는다 (기준 3)", async () => {
    const fetchMock = stubConsentApi(false);
    renderShell();

    expect(await screen.findByText(APP_CONTENT)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: GATE_TITLE })).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mePaths = fetchMock.mock.calls.filter(
      ([request]) => new URL(request.url).pathname === "/api/users/me",
    );
    expect(mePaths).toHaveLength(0);
  });

  it("CTA 클릭 시 PUT이 발사되고 성공하면 게이트가 해제되어 앱 화면으로 진입한다 (기준 8)", async () => {
    signInForTest();
    stubConsentApi(false);
    renderShell();
    await screen.findByRole("heading", { name: GATE_TITLE });

    fireEvent.click(screen.getByRole("button", { name: "동의하고 시작하기" }));

    expect(await screen.findByText(APP_CONTENT)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: GATE_TITLE })).toBeNull();
  });

  it("게이트의 로그아웃 클릭 시 logout API 호출 후 로컬 세션이 해제되어 비로그인 홈 화면으로 나간다 (기준 11 — codex P1 반영)", async () => {
    signInForTest();
    const fetchMock = stubConsentApi(false);
    renderShell();
    await screen.findByRole("heading", { name: GATE_TITLE });

    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(await screen.findByText(APP_CONTENT)).toBeTruthy();
    // 서버 세션(HttpOnly 리프레시 쿠키) 무효화 — 로컬 해제만으로는 재인증 여지 (codex P1)
    const paths = fetchMock.mock.calls.map(
      ([request]) => new URL(request.url).pathname,
    );
    expect(paths).toContain("/api/auth/logout");
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(screen.queryByRole("heading", { name: GATE_TITLE })).toBeNull();
  });

  it("게이트 표시 중 브라우저 뒤로가기(popstate)는 로그인 중단이다 — logout API 발사, navigate 없이 팝된 라우트가 익명으로 렌더 (v4)", async () => {
    signInForTest();
    const fetchMock = stubConsentApi(false);
    const router = renderShell();
    await screen.findByRole("heading", { name: GATE_TITLE });

    fireEvent.popState(window);

    expect(await screen.findByText(APP_CONTENT)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: GATE_TITLE })).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    // 서버 세션 무효화는 버튼 로그아웃(codex P1)과 동일 보장 — logout API 경유
    expect(logoutCallsOf(fetchMock)).toHaveLength(1);
    // navigate 하지 않는다 — 브라우저가 팝한 위치(하네스 초기 "/") 그대로 렌더
    expect(router.state.location.pathname).toBe("/");
  });

  it("뒤로가기 연타에도 로그인 중단은 1회만 발사된다 (v4 — 중복 발화 가드)", async () => {
    signInForTest();
    const fetchMock = stubConsentApi(false);
    renderShell();
    await screen.findByRole("heading", { name: GATE_TITLE });

    fireEvent.popState(window);
    fireEvent.popState(window);

    await screen.findByText(APP_CONTENT);
    expect(logoutCallsOf(fetchMock)).toHaveLength(1);
  });

  it("뒤로가기 로그인 중단이 진행 중일 때 로그아웃 버튼을 눌러도 추가 발사 없이 1회만 로그아웃된다 (codex P2 — 교차 트리거 공용 가드)", async () => {
    signInForTest();
    const fetchMock = stubConsentApi(false);
    renderShell();
    await screen.findByRole("heading", { name: GATE_TITLE });

    fireEvent.popState(window);
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    await screen.findByText(APP_CONTENT);
    expect(logoutCallsOf(fetchMock)).toHaveLength(1);
  });

  it("앞으로가기(forward) popstate에서는 로그아웃되지 않고 게이트가 유지된다 (codex P1 — 뒤로가기만 이탈 제스처)", async () => {
    signInForTest();
    const fetchMock = stubConsentApi(false);
    // createBrowserRouter(@remix-run/router)가 히스토리 엔트리마다 심는 단조 증가 idx 재현
    window.history.replaceState({ idx: 5 }, "");
    renderShell();
    await screen.findByRole("heading", { name: GATE_TITLE });

    // 정방향 트래버설 — idx가 커진 엔트리에서 popstate 발화
    window.history.replaceState({ idx: 6 }, "");
    fireEvent.popState(window);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByRole("heading", { name: GATE_TITLE })).toBeTruthy();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(logoutCallsOf(fetchMock)).toHaveLength(0);
  });

  it("앞으로가기를 무시한 뒤의 뒤로가기에는 로그인 중단이 동작한다 (codex P1 — 마지막 관찰 idx 기준 다단 판별)", async () => {
    signInForTest();
    const fetchMock = stubConsentApi(false);
    window.history.replaceState({ idx: 5 }, "");
    renderShell();
    await screen.findByRole("heading", { name: GATE_TITLE });
    // 정방향(5→6) 무시 이력 — 마운트 시점 idx가 아니라 마지막 관찰 idx와 비교해야
    // 이어지는 역방향(6→5)을 뒤로가기로 판별할 수 있다
    window.history.replaceState({ idx: 6 }, "");
    fireEvent.popState(window);

    window.history.replaceState({ idx: 5 }, "");
    fireEvent.popState(window);

    expect(await screen.findByText(APP_CONTENT)).toBeTruthy();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(logoutCallsOf(fetchMock)).toHaveLength(1);
  });

  it("미동의 상태의 라우트 이동(pushState 방향)은 여전히 게이트 재렌더다 — 뒤로가기만 이탈 제스처 (v4, 기준 1 유지)", async () => {
    signInForTest();
    const fetchMock = stubConsentApi(false);
    const router = renderShell();
    await screen.findByRole("heading", { name: GATE_TITLE });

    await act(() => router.navigate("/dex"));

    expect(router.state.location.pathname).toBe("/dex");
    expect(screen.getByRole("heading", { name: GATE_TITLE })).toBeTruthy();
    expect(screen.queryByText(DEX_CONTENT)).toBeNull();
    expect(logoutCallsOf(fetchMock)).toHaveLength(0);
  });
});
