import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { consoleRoutes } from "@/app/router";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";

/**
 * mustChange 강제 이동 라우팅 통합 스모크 (MSG-542 AC 4·7) — 실제 콘솔 라우트 등록
 * (`consoleRoutes` — 이 티켓은 수정하지 않는다)을 마운트해 MSG-541 게이트와 이 티켓의
 * 설정 화면이 어떻게 협업하는지를 고정한다:
 *
 * ① 착지 라우트 진입 → 게이트가 설정 화면으로 보낸다 (건너뛸 수 없다)
 * ② 설정 성공 → 상태 캐시가 갱신되어 게이트 재발동 없이 role별 홈에 착지한다
 *
 * fetch 스텁의 `mustChange`는 initial 성공에 맞춰 뒤집힌다 — 서버가 강제 변경 상태를
 * 실제로 해제하기 때문이다(그러지 않으면 캐시 갱신만으로 통과하는 오탐이 된다).
 */
const PROFILE = {
  email: "tourism@busan.go.kr",
  nickname: "부산광역시 관광마이스과",
  profileImageUrl: null,
  createdAt: "2026-08-01T00:00:00Z",
  locationConsent: true,
  role: "ORG" as const,
};

const mustChangeSessionFetch = () => {
  let mustChange = true;
  return stubFetch((request) => {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/auth/password/initial") {
      mustChange = false;
      return envelopeResponse(null);
    }
    if (pathname === "/api/auth/password/status") {
      return envelopeResponse({ mustChange });
    }
    return envelopeResponse(PROFILE);
  });
};

const renderConsoleAt = (route: string) => {
  const router = createMemoryRouter(consoleRoutes, { initialEntries: [route] });
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

describe("mustChange 강제 설정 게이트와 설정 화면의 협업 (AC 4·7)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("mustChange=true 계정이 운영자 홈으로 진입하면 비밀번호 설정 화면으로 강제 이동된다 (AC 4)", async () => {
    signInForTest();
    mustChangeSessionFetch();

    const router = renderConsoleAt(CONSOLE_ROUTES.orgHome);

    expect(
      await screen.findByRole("heading", {
        name: "비밀번호를 새로 설정하세요",
        level: 1,
      }),
    ).toBeDefined();
    expect(router.state.location.pathname).toBe(
      CONSOLE_ROUTES.orgPasswordSetup,
    );
  });

  it("설정 화면에서 다른 콘솔 보호 라우트로 이동해도 게이트가 되돌린다 — 건너뛸 수 없다 (AC 4)", async () => {
    signInForTest();
    mustChangeSessionFetch();
    const router = renderConsoleAt(CONSOLE_ROUTES.orgPasswordSetup);
    await screen.findByRole("heading", { name: "비밀번호를 새로 설정하세요" });

    await router.navigate(CONSOLE_ROUTES.orgSubmissions);

    // 게이트의 Navigate가 해소되고 화면이 다시 그려질 때까지 기다린 뒤 경로를 확인한다
    expect(
      await screen.findByRole("heading", {
        name: "비밀번호를 새로 설정하세요",
      }),
    ).toBeDefined();
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        CONSOLE_ROUTES.orgPasswordSetup,
      ),
    );
  });

  it("설정을 마치면 게이트 재발동 없이 운영자 홈에 착지한다 (AC 7)", async () => {
    signInForTest();
    mustChangeSessionFetch();
    const router = renderConsoleAt(CONSOLE_ROUTES.orgHome);
    await screen.findByRole("heading", { name: "비밀번호를 새로 설정하세요" });

    fireEvent.change(screen.getByLabelText("새 비밀번호"), {
      target: { value: "fillmap12" },
    });
    fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), {
      target: { value: "fillmap12" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "설정하고 콘솔 시작하기" }),
    );

    expect(
      await screen.findByRole("heading", { name: "신청 현황", level: 1 }),
    ).toBeDefined();
    expect(router.state.location.pathname).toBe(CONSOLE_ROUTES.orgHome);
  });
});
