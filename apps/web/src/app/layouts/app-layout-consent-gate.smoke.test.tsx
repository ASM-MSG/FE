import { Route, Routes } from "react-router-dom";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { renderWithProviders } from "@/test/render-with-providers";
import { AppLayout } from "./AppLayout";

/**
 * 온보딩 동의 게이트 흐름 스모크 (MSG-407 기준 1·2·3·8·11) — 여러 유닛(인증 스토어 +
 * 게이트 훅 + 동의 화면 + 앱 셸)의 협업 결과를 실제 조립으로 검증한다.
 * 게이트는 라우트가 아닌 전면 조건 렌더(추정 1) — AppLayout이 앱 콘텐츠 대신
 * 동의 화면을 렌더한다.
 */

const APP_CONTENT = "앱 홈 콘텐츠";
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

// 프로바이더 스택은 공용 헬퍼 재사용 (중복 게이트 환류 — dex-test-harness와 사본이 되던 것)
const renderShell = () =>
  renderWithProviders(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<div>{APP_CONTENT}</div>} />
      </Route>
    </Routes>,
  );

beforeEach(() => {
  signOutForTest();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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
});
