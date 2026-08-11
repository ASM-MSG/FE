import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webStorage } from "@/shared/storage";
import { envelopeResponse } from "@/test/envelope-response";
import { AUTH_STORAGE_KEY, useAuthStore } from "../model/auth-store";
import { useLoginModalStore } from "../model/login-modal-store";
import { DevLoginPanel } from "./DevLoginPanel";

/**
 * 개발용 로그인 패널 스모크 (MSG-352 A1·A5).
 * DEV 게이트 분기·실패 메시지·성공 시 모달 닫힘 배선만 고정한다.
 * accessToken 저장·X-Device-Id 저장 등 mutation 배선은 use-auth-mutations.test가 담당.
 * 프로덕션 번들 미포함(정적 치환)은 자동 테스트 한계 — 스펙 리스크 기재대로 분기 로직까지만 검증.
 */

const renderPanel = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DevLoginPanel />
    </QueryClientProvider>,
  );

const submitLogin = () => {
  fireEvent.change(screen.getByLabelText("이메일"), {
    target: { value: "dev@fillmap.kr" },
  });
  fireEvent.change(screen.getByLabelText("비밀번호"), {
    target: { value: "password12" },
  });
  fireEvent.click(screen.getByRole("button", { name: "개발용 로그인" }));
};

/** fetch 응답을 스텁하고 패널 렌더→제출까지 — 실패·성공 케이스 공통 준비 절차 */
const stubFetchAndSubmit = (respond: () => Promise<Response>) => {
  vi.stubGlobal("fetch", vi.fn(respond));
  renderPanel();
  submitLogin();
};

/** vitest 환경은 DEV=true — 게이트 분기 검증을 위해 값만 스왑하고 복원한다 */
const originalDev = import.meta.env.DEV;

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, isAuthenticated: false });
  useLoginModalStore.setState({ open: true });
  webStorage.removeItem(AUTH_STORAGE_KEY);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  import.meta.env.DEV = originalDev;
});

describe("개발용 로그인 패널 (A1 게이트)", () => {
  it("dev 빌드(DEV=true)에서는 이메일·비밀번호 입력과 로그인 버튼이 렌더된다", () => {
    renderPanel();

    expect(screen.getByLabelText("이메일")).toBeTruthy();
    expect(screen.getByLabelText("비밀번호")).toBeTruthy();
    expect(screen.getByRole("button", { name: "개발용 로그인" })).toBeTruthy();
  });

  it("DEV가 아니면 null을 반환해 아무것도 렌더하지 않는다", () => {
    import.meta.env.DEV = false;
    const { container } = renderPanel();

    expect(container.innerHTML).toBe("");
  });
});

describe("개발용 로그인 패널 (A5 실패 · 성공 배선)", () => {
  it("로그인 실패(API 오류) 시 실패 메시지가 표시된다", async () => {
    stubFetchAndSubmit(async () => new Response(null, { status: 401 }));

    await waitFor(() =>
      expect(screen.getByText(/로그인에 실패했어요/)).toBeTruthy(),
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("실패 시 두 입력에 오류 상태(aria-invalid)가 반영된다", async () => {
    stubFetchAndSubmit(async () => new Response(null, { status: 401 }));

    await waitFor(() =>
      expect(screen.getByText(/로그인에 실패했어요/)).toBeTruthy(),
    );
    expect(screen.getByLabelText("이메일").getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(screen.getByLabelText("비밀번호").getAttribute("aria-invalid")).toBe(
      "true",
    );
  });

  it("서버 오류(5xx)면 자격증명 안내 대신 서버 오류 안내가 표시된다", async () => {
    stubFetchAndSubmit(async () => new Response(null, { status: 500 }));

    await waitFor(() =>
      expect(screen.getByText(/서버 오류가 발생했어요/)).toBeTruthy(),
    );
  });

  it("네트워크 실패(응답 없음)면 연결 안내가 표시된다", async () => {
    stubFetchAndSubmit(async () => {
      throw new TypeError("Failed to fetch");
    });

    await waitFor(() =>
      expect(screen.getByText(/서버에 연결하지 못했어요/)).toBeTruthy(),
    );
  });

  it("로그인 성공 시 인증 상태가 되고 로그인 모달이 닫힌다", async () => {
    stubFetchAndSubmit(async () =>
      envelopeResponse({
        accessToken: "dev-login-token",
        refreshToken: null,
      }),
    );

    await waitFor(() =>
      expect(useAuthStore.getState().isAuthenticated).toBe(true),
    );
    expect(useAuthStore.getState().accessToken).toBe("dev-login-token");
    expect(useLoginModalStore.getState().open).toBe(false);
  });
});
