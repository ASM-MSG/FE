import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { renderWithProviders } from "@/test/render-with-providers";
import { type ReceivedRequest, stubFetch } from "@/test/stub-fetch";
import { OrgPasswordResetPage } from "./OrgPasswordResetPage";

/**
 * 비밀번호 재설정 흐름 스모크 (MSG-542 AC 9·10·11·12) — 한 라우트가 요청 → 발송 완료 →
 * (링크 진입) 새 비밀번호 확정 세 모드를 어떻게 가르는지, 그리고 각 모드의 선검증·실패
 * 복구 경로를 고정한다.
 */
const requestsTo = (received: ReceivedRequest[], pathname: string) =>
  received.filter(({ request }) => new URL(request.url).pathname === pathname);

const RESET_REQUEST_PATH = "/api/auth/password/reset-request";
const RESET_PATH = "/api/auth/password/reset";

const resetFetch = (
  respond: (pathname: string) => Response = () => envelopeResponse(null),
): ReceivedRequest[] =>
  stubFetch((request) => respond(new URL(request.url).pathname));

const submitEmail = (email: string) => {
  fireEvent.change(screen.getByLabelText("공식 이메일"), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole("button", { name: "재설정 링크 받기" }));
};

const submitNewPassword = (password: string, confirmation = password) => {
  fireEvent.change(screen.getByLabelText("새 비밀번호"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), {
    target: { value: confirmation },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "새 비밀번호로 변경하기" }),
  );
};

describe("비밀번호 재설정 요청 모드 (AC 9)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("token 쿼리 없이 진입하면 요청 화면이 렌더된다 (AC 9)", () => {
    resetFetch();

    renderWithProviders(
      <OrgPasswordResetPage />,
      CONSOLE_ROUTES.orgPasswordReset,
    );

    expect(
      screen.getByRole("heading", { name: "비밀번호 재설정", level: 1 }),
    ).toBeDefined();
    expect(
      screen.getByPlaceholderText("name@organization.go.kr"),
    ).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "‹ 행사 운영자 로그인" })
        .getAttribute("href"),
    ).toBe(CONSOLE_ROUTES.orgLogin);
  });

  it("이메일 형식이 아니면 제출 요청이 나가지 않고 안내된다 (AC 9)", async () => {
    const received = resetFetch();
    renderWithProviders(
      <OrgPasswordResetPage />,
      CONSOLE_ROUTES.orgPasswordReset,
    );

    submitEmail("tourism-busan");

    expect(
      await screen.findByText("이메일 형식으로 입력해주세요"),
    ).toBeDefined();
    expect(requestsTo(received, RESET_REQUEST_PATH)).toHaveLength(0);
  });
});

describe("재설정 링크 발송 완료 (AC 10)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("요청 성공 시 같은 라우트에서 발송 완료 화면으로 전환된다 (AC 10)", async () => {
    resetFetch();
    renderWithProviders(
      <OrgPasswordResetPage />,
      CONSOLE_ROUTES.orgPasswordReset,
    );

    submitEmail("tourism@busan.go.kr");

    expect(
      await screen.findByRole("heading", {
        name: "재설정 링크를 보냈습니다",
        level: 1,
      }),
    ).toBeDefined();
    expect(screen.getByText(/tourism@busan\.go\.kr/)).toBeDefined();
    expect(screen.getByText("보낸 시각")).toBeDefined();
    expect(screen.getByText("유효 기간")).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "로그인 페이지로 돌아가기" })
        .getAttribute("href"),
    ).toBe(CONSOLE_ROUTES.orgLogin);
  });

  it("'다시 보내기'는 같은 이메일로 재요청한다 (AC 10)", async () => {
    const received = resetFetch();
    renderWithProviders(
      <OrgPasswordResetPage />,
      CONSOLE_ROUTES.orgPasswordReset,
    );
    submitEmail("tourism@busan.go.kr");
    await screen.findByRole("heading", { name: "재설정 링크를 보냈습니다" });

    fireEvent.click(screen.getByRole("button", { name: "다시 보내기" }));

    await waitFor(() =>
      expect(requestsTo(received, RESET_REQUEST_PATH)).toHaveLength(2),
    );
    expect(requestsTo(received, RESET_REQUEST_PATH).at(-1)?.body).toEqual({
      email: "tourism@busan.go.kr",
    });
  });
});

describe("재설정 링크 진입 모드 (AC 11·12)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("?token= 진입 시 새 비밀번호 입력 모드로 분기된다 — 라우트 신설 없음 (AC 11)", () => {
    resetFetch();

    renderWithProviders(
      <OrgPasswordResetPage />,
      `${CONSOLE_ROUTES.orgPasswordReset}?token=reset-token`,
    );

    expect(
      screen.getByRole("heading", { name: "새 비밀번호 설정", level: 1 }),
    ).toBeDefined();
    expect(screen.getByLabelText("새 비밀번호")).toBeDefined();
  });

  it("성공 시 로컬 세션이 정리되고 로그인 이동 경로가 뜬다 (AC 11·추정 7)", async () => {
    signInForTest();
    const received = resetFetch();
    renderWithProviders(
      <OrgPasswordResetPage />,
      `${CONSOLE_ROUTES.orgPasswordReset}?token=reset-token`,
    );

    submitNewPassword("fillmap12");

    expect(
      await screen.findByRole("heading", {
        name: "새 비밀번호를 설정했습니다",
        level: 1,
      }),
    ).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "로그인 페이지로 돌아가기" })
        .getAttribute("href"),
    ).toBe(CONSOLE_ROUTES.orgLogin);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(requestsTo(received, RESET_PATH).at(-1)?.body).toEqual({
      token: "reset-token",
      newPassword: "fillmap12",
    });
  });

  it("정책 미충족이면 제출 요청이 나가지 않는다 — setup과 같은 검증 (AC 6)", async () => {
    const received = resetFetch();
    renderWithProviders(
      <OrgPasswordResetPage />,
      `${CONSOLE_ROUTES.orgPasswordReset}?token=reset-token`,
    );

    submitNewPassword("short1");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "영문과 숫자 각 1자 이상, 8~64자",
    );
    expect(requestsTo(received, RESET_PATH)).toHaveLength(0);
  });

  it("토큰이 만료·무효면 서버 message와 재요청 경로가 뜬다 (AC 12)", async () => {
    resetFetch((pathname) =>
      pathname === RESET_PATH
        ? errorEnvelope(1400, "재설정 링크가 만료되었습니다", 400)
        : envelopeResponse(null),
    );
    renderWithProviders(
      <OrgPasswordResetPage />,
      `${CONSOLE_ROUTES.orgPasswordReset}?token=expired-token`,
    );

    submitNewPassword("fillmap12");

    expect(
      await screen.findByText("재설정 링크가 만료되었습니다"),
    ).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "재설정 링크 다시 요청하기" })
        .getAttribute("href"),
    ).toBe(CONSOLE_ROUTES.orgPasswordReset);
  });
});
