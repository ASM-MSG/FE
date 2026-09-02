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
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { type ReceivedRequest, stubFetch } from "@/test/stub-fetch";
import { OrgLoginPage } from "./OrgLoginPage";

/**
 * 콘솔 로그인 흐름 스모크 (MSG-542 AC 1·2·3·13) — 로그인 제출 → role별 착지 분기,
 * 실패 안내, 기존 USER 세션에서의 동작을 실제 조립(폼 + useEmailLogin + 라우터)으로 고정한다.
 * 착지 라우트는 자리표시 제목만 둔다 — 콘솔 홈 실구현은 MSG-545 범위다.
 */
const PROFILE = {
  email: "tourism@busan.go.kr",
  nickname: "부산광역시 관광마이스과",
  profileImageUrl: null,
  createdAt: "2026-08-01T00:00:00Z",
  locationConsent: true,
};

/** 로그인 응답의 role과 그 이후 getMe의 role을 함께 공급한다 — 로그인 성공이 세션을 바꾼다 */
const loginFetch = (
  loginRole: "USER" | "ORG" | "ADMIN",
  sessionRoleBeforeLogin: "USER" | "ORG" | "ADMIN" = loginRole,
): ReceivedRequest[] => {
  let sessionRole = sessionRoleBeforeLogin;
  return stubFetch((request) => {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/auth/login") {
      sessionRole = loginRole;
      return envelopeResponse({
        accessToken: "console-token",
        refreshToken: null,
        role: loginRole,
      });
    }
    return envelopeResponse({ ...PROFILE, role: sessionRole });
  });
};

const renderLogin = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider
        router={createMemoryRouter(
          [
            { path: CONSOLE_ROUTES.orgLogin, element: <OrgLoginPage /> },
            { path: CONSOLE_ROUTES.orgHome, element: <h1>신청 현황</h1> },
            { path: CONSOLE_ROUTES.adminReview, element: <h1>행사 심사</h1> },
          ],
          { initialEntries: [CONSOLE_ROUTES.orgLogin] },
        )}
      />
    </QueryClientProvider>,
  );

const submitCredentials = () => {
  fireEvent.change(screen.getByLabelText("이메일"), {
    target: { value: "tourism@busan.go.kr" },
  });
  fireEvent.change(screen.getByLabelText("비밀번호"), {
    target: { value: "initial-pass1" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "행사 운영자 계정으로 로그인" }),
  );
};

describe("콘솔 로그인 화면 (AC 1)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("워드마크·제목·입력·재설정 링크·계정 발급 링크가 렌더된다 (AC 1)", () => {
    loginFetch("ORG");

    renderLogin();

    expect(screen.getByText("FILLMAP")).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "행사 운영자 로그인", level: 1 }),
    ).toBeDefined();
    expect(screen.getByLabelText("이메일")).toBeDefined();
    expect(screen.getByLabelText("비밀번호")).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "비밀번호를 잊으셨나요?" })
        .getAttribute("href"),
    ).toBe(CONSOLE_ROUTES.orgPasswordReset);
    expect(
      screen
        .getByRole("link", { name: "계정 발급 요청하기 →" })
        .getAttribute("href"),
    ).toBe(CONSOLE_ROUTES.orgAccountRequest);
  });

  it("'보기'를 누르면 비밀번호가 평문으로 표시된다 (AC 1)", () => {
    loginFetch("ORG");
    renderLogin();

    fireEvent.click(screen.getByRole("button", { name: "보기" }));

    expect(screen.getByLabelText("비밀번호").getAttribute("type")).toBe("text");
  });

  it("문서 제목이 '{화면 제목} | 필맵' 관례를 따른다 (AC 1)", () => {
    loginFetch("ORG");

    renderLogin();

    expect(document.title).toBe("행사 운영자 로그인 | 필맵");
  });
});

describe("콘솔 로그인 착지 분기 (AC 2)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("ORG 계정으로 로그인하면 운영자 홈에 착지한다 (AC 2)", async () => {
    loginFetch("ORG");
    renderLogin();

    submitCredentials();

    expect(
      await screen.findByRole("heading", { name: "신청 현황" }),
    ).toBeDefined();
  });

  it("ADMIN 계정으로 로그인하면 심사 큐에 착지한다 (AC 2)", async () => {
    loginFetch("ADMIN");
    renderLogin();

    submitCredentials();

    expect(
      await screen.findByRole("heading", { name: "행사 심사" }),
    ).toBeDefined();
  });

  it("role이 일반 회원이면 이동하지 않고 콘솔 권한 없음 안내가 뜬다 (AC 2·추정 4)", async () => {
    loginFetch("USER");
    renderLogin();

    submitCredentials();

    // 폼 오류(role=alert)로 안내된다 — 같은 문구가 세션 안내로도 쓰이므로 역할로 구분한다
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "일반 회원 계정으로는 콘솔을 이용할 수 없습니다",
    );
    expect(
      screen.getByRole("heading", { name: "행사 운영자 로그인", level: 1 }),
    ).toBeDefined();
  });
});

describe("콘솔 로그인 실패 안내 (AC 3)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("자격이 맞지 않으면 화면을 떠나지 않고 서버 message가 안내된다 (AC 3)", async () => {
    stubFetch(() =>
      errorEnvelope(1002, "이메일 또는 비밀번호가 올바르지 않습니다", 401),
    );
    renderLogin();

    submitCredentials();

    expect(
      await screen.findByText("이메일 또는 비밀번호가 올바르지 않습니다"),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "행사 운영자 로그인", level: 1 }),
    ).toBeDefined();
  });

  it("응답이 없는 실패는 네트워크 오류 문구로 안내되고 재제출할 수 있다 (AC 3)", async () => {
    let attempts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        attempts += 1;
        throw new TypeError("Failed to fetch");
      }),
    );
    renderLogin();

    submitCredentials();

    expect(
      await screen.findByText(/네트워크 상태를 확인해주세요/),
    ).toBeDefined();

    submitCredentials();

    await waitFor(() => expect(attempts).toBeGreaterThan(1));
  });
});

describe("KAKAO 세션에서의 콘솔 로그인 (AC 13)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("일반 회원 세션이 있어도 회송 없이 폼이 렌더되고 ORG 로그인으로 세션이 전환된다 (AC 13)", async () => {
    signInForTest();
    loginFetch("ORG", "USER");
    renderLogin();

    // 기존 세션이 일반 회원이라는 안내가 붙되 폼은 그대로 동작한다
    expect(
      screen.getByRole("heading", { name: "행사 운영자 로그인", level: 1 }),
    ).toBeDefined();
    expect(
      await screen.findByText(/일반 회원 계정으로는 콘솔을 이용할 수 없습니다/),
    ).toBeDefined();

    submitCredentials();

    expect(
      await screen.findByRole("heading", { name: "신청 현황" }),
    ).toBeDefined();
  });
});
