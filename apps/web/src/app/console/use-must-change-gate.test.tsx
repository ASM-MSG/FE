import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { consoleSessionFetch } from "@/test/console-session";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { useMustChangeGate } from "./use-must-change-gate";

const wrapperAt = (route: string) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return Wrapper;
};

const renderGate = (route: string) =>
  renderHook(() => useMustChangeGate(), { wrapper: wrapperAt(route) });

describe("useMustChangeGate — 첫 로그인 비밀번호 강제 설정 게이트 (AC 9)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("ORG 세션의 mustChange=true면 /org/password/setup으로 강제 이동시킨다 (AC 9)", async () => {
    signInForTest();
    consoleSessionFetch("ORG", { mustChange: true });

    const { result } = renderGate(CONSOLE_ROUTES.orgHome);

    await waitFor(() =>
      expect(result.current).toBe(CONSOLE_ROUTES.orgPasswordSetup),
    );
  });

  it("ADMIN 세션에도 같은 게이트가 적용된다 — 착지는 /org/password/setup 공용 (질문 8 확정)", async () => {
    signInForTest();
    consoleSessionFetch("ADMIN", { mustChange: true });

    const { result } = renderGate(CONSOLE_ROUTES.adminReview);

    await waitFor(() =>
      expect(result.current).toBe(CONSOLE_ROUTES.orgPasswordSetup),
    );
  });

  it("이미 /org/password/setup에 있으면 다시 보내지 않는다 — 리다이렉트 루프 방지 (AC 9)", async () => {
    signInForTest();
    consoleSessionFetch("ORG", { mustChange: true });

    const { result } = renderGate(CONSOLE_ROUTES.orgPasswordSetup);

    await waitFor(() => expect(result.current).toBeNull());
  });

  it("mustChange=false면 게이트가 발동하지 않는다 (AC 9)", async () => {
    signInForTest();
    consoleSessionFetch("ORG", { mustChange: false });

    const { result } = renderGate(CONSOLE_ROUTES.orgHome);

    await waitFor(() => expect(result.current).toBeNull());
  });

  it("상태 조회가 실패하면 게이트가 발동하지 않는다 — 서버 확답에서만 발동 (AC 9)", async () => {
    signInForTest();
    stubFetch((request) => {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/auth/password/status") {
        return errorEnvelope(500, "서버 오류", 500);
      }
      return envelopeResponse({
        email: null,
        nickname: "운영자",
        profileImageUrl: null,
        createdAt: "2026-08-01T00:00:00Z",
        locationConsent: true,
        role: "ORG",
      });
    });

    const { result } = renderGate(CONSOLE_ROUTES.orgHome);

    await waitFor(() => expect(result.current).toBeNull());
  });

  it("USER 세션은 상태 조회를 발사하지 않는다 — 콘솔 세션만 게이트 대상 (AC 9)", async () => {
    signInForTest();
    const received = consoleSessionFetch("USER", { mustChange: true });
    const urls = () =>
      received.map(({ request }) => new URL(request.url).pathname);

    const { result } = renderGate(CONSOLE_ROUTES.orgHome);

    // role 확정(getMe 도착)까지 기다린 뒤에도 상태 조회가 없어야 한다
    await waitFor(() => expect(urls()).toContain("/api/users/me"));
    await waitFor(() => expect(result.current).toBeNull());
    expect(urls()).not.toContain("/api/auth/password/status");
  });
});
