import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { renderWithProviders } from "@/test/render-with-providers";
import { type ReceivedRequest, stubFetch } from "@/test/stub-fetch";
import { OrgPasswordSetupPage } from "./OrgPasswordSetupPage";

/**
 * 첫 로그인 비밀번호 설정 화면 스모크 (MSG-542 AC 5·6·8) — 선검증이 요청을 막는 계약과
 * developCode 2446 전용 안내를 고정한다. 성공 후 착지·게이트 협업은 라우팅 통합
 * 스모크(org-must-change.smoke)가 다룬다.
 */
const PROFILE = {
  email: "tourism@busan.go.kr",
  nickname: "부산광역시 관광마이스과",
  profileImageUrl: null,
  createdAt: "2026-08-01T00:00:00Z",
  locationConsent: true,
  role: "ORG" as const,
};

const setupFetch = (
  initialResponse: () => Response = () => envelopeResponse(null),
): ReceivedRequest[] =>
  stubFetch((request) => {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/auth/password/initial") return initialResponse();
    if (pathname === "/api/auth/password/status") {
      return envelopeResponse({ mustChange: true });
    }
    return envelopeResponse(PROFILE);
  });

const initialRequests = (received: ReceivedRequest[]) =>
  received.filter(
    ({ request }) =>
      new URL(request.url).pathname === "/api/auth/password/initial",
  );

const fillNewPassword = (password: string, confirmation: string) => {
  fireEvent.change(screen.getByLabelText("새 비밀번호"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), {
    target: { value: confirmation },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "설정하고 콘솔 시작하기" }),
  );
};

describe("첫 로그인 비밀번호 설정 화면 (AC 5)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("제목·새 비밀번호·확인 입력·규칙 힌트가 렌더된다 (AC 5)", () => {
    signInForTest();
    setupFetch();

    renderWithProviders(<OrgPasswordSetupPage />);

    expect(
      screen.getByRole("heading", {
        name: "비밀번호를 새로 설정하세요",
        level: 1,
      }),
    ).toBeDefined();
    expect(screen.getByLabelText("새 비밀번호")).toBeDefined();
    expect(screen.getByLabelText("새 비밀번호 확인")).toBeDefined();
    expect(screen.getByText("영문과 숫자 각 1자 이상, 8~64자")).toBeDefined();
  });
});

describe("새 비밀번호 선검증 (AC 6)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("서버 정책을 충족하지 않으면 제출 요청이 나가지 않고 규칙이 안내된다 (AC 6)", async () => {
    signInForTest();
    const received = setupFetch();
    renderWithProviders(<OrgPasswordSetupPage />);

    fillNewPassword("short1", "short1");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "영문과 숫자 각 1자 이상, 8~64자",
    );
    expect(initialRequests(received)).toHaveLength(0);
  });

  it("확인 값이 다르면 제출 요청이 나가지 않고 불일치가 안내된다 (AC 6)", async () => {
    signInForTest();
    const received = setupFetch();
    renderWithProviders(<OrgPasswordSetupPage />);

    fillNewPassword("fillmap12", "fillmap13");

    expect(
      await screen.findByText("비밀번호 확인이 일치하지 않습니다"),
    ).toBeDefined();
    expect(initialRequests(received)).toHaveLength(0);
  });
});

describe("첫 로그인 설정 실패 안내 (AC 8)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("developCode 2446이면 이미 설정한 계정 안내와 콘솔 홈 이동 경로가 뜬다 (AC 8)", async () => {
    signInForTest();
    setupFetch(() => errorEnvelope(2446, "이미 비밀번호를 설정했습니다", 400));
    renderWithProviders(<OrgPasswordSetupPage />);

    fillNewPassword("fillmap12", "fillmap12");

    expect(
      await screen.findByText(/이미 비밀번호를 설정한 계정입니다/),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "콘솔 홈으로 이동" }),
    ).toBeDefined();
  });

  it("그 외 실패는 서버 message로 안내되고 재제출할 수 있다 (AC 8)", async () => {
    signInForTest();
    const received = setupFetch(() =>
      errorEnvelope(2445, "소셜 로그인 계정입니다", 400),
    );
    renderWithProviders(<OrgPasswordSetupPage />);

    fillNewPassword("fillmap12", "fillmap12");

    expect(await screen.findByText("소셜 로그인 계정입니다")).toBeDefined();

    fireEvent.click(
      screen.getByRole("button", { name: "설정하고 콘솔 시작하기" }),
    );

    await waitFor(() => expect(initialRequests(received)).toHaveLength(2));
  });
});
