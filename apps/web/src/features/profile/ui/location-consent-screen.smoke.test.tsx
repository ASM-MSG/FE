import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { signInForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { LocationConsentScreen } from "./LocationConsentScreen";

/**
 * 위치정보 동의 화면 스모크 (MSG-407 기준 4~11 화면 계약) — Figma 14781:3343 구성의
 * 접근성 이름·CTA 활성 조건·요청 발사 계약만 고정한다. 픽셀·Figma 대조는 검증 단계 몫.
 * 게이트 해제(캐시 갱신 경유 앱 진입)는 app-layout-consent-gate 스모크가 커버.
 */

const REQUIRED_LABEL = "[필수] 위치기반서비스 이용약관 동의";
const MARKETING_LABEL = "[선택] 마케팅 정보 수신 동의";

const CONSENTED_ME = {
  email: null,
  nickname: "필맵퍼",
  profileImageUrl: null,
  createdAt: "2026-05-02T09:00:00",
  locationConsent: true,
};

const Providers = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    }
  >
    {children}
  </QueryClientProvider>
);

const renderScreen = (onLoggedOut = vi.fn()) => {
  render(
    <Providers>
      <LocationConsentScreen onLoggedOut={onLoggedOut} />
    </Providers>,
  );
  return onLoggedOut;
};

const requiredCheckbox = () =>
  screen.getByRole("checkbox", { name: REQUIRED_LABEL }) as HTMLInputElement;
const marketingCheckbox = () =>
  screen.getByRole("checkbox", { name: MARKETING_LABEL }) as HTMLInputElement;
const ctaButton = () =>
  screen.getByRole("button", {
    name: "동의하고 시작하기",
  }) as HTMLButtonElement;

beforeEach(() => {
  signInForTest();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("위치정보 동의 화면 (MSG-407)", () => {
  it("Figma 14781:3343 구성이 렌더된다 — 제목·안내문·동의 행 2개·CTA + 로그아웃 보조 버튼, 철회 캡션은 없다 (기준 4·11 — v3 결정 1 편차)", () => {
    renderScreen();

    expect(
      screen.getByRole("heading", { name: "위치정보 이용 동의" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/위치기반서비스 이용약관 동의가 필요해요/),
    ).toBeTruthy();
    // [필수] 체크박스 초기 상태 = 체크됨 (추정 2 — 디자인 그대로, CTA 즉시 활성)
    expect(requiredCheckbox().checked).toBe(true);
    expect(marketingCheckbox().checked).toBe(false);
    expect(ctaButton().disabled).toBe(false);
    // 디자인의 철회 안내 캡션은 결정 1(인앱 철회 접점 제거)로 거짓 문구 — 부재가 정답 (기준 4)
    expect(
      screen.queryByText("동의는 프로필 편집에서 언제든지 철회할 수 있어요."),
    ).toBeNull();
    // 디자인(14781:3343)에 없는 구현 추가분 — 게이트 이탈 수단 (확정 4)
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeTruthy();
  });

  it("두 동의 행의 [보기] 링크는 표시되되 비활성(클릭 불가 placeholder)이다 (기준 6)", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderScreen();

    const viewButtons = screen.getAllByRole("button", { name: "보기" });

    expect(viewButtons).toHaveLength(2);
    for (const button of viewButtons) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(button);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("[필수] 체크 해제 상태에서는 CTA가 비활성이고, 다시 체크하면 활성이다 (기준 7)", () => {
    renderScreen();

    fireEvent.click(requiredCheckbox());
    expect(ctaButton().disabled).toBe(true);

    fireEvent.click(requiredCheckbox());
    expect(ctaButton().disabled).toBe(false);
  });

  it("[선택] 마케팅 행은 체크 토글만 되고 요청이 발사되지 않으며 CTA 활성 조건에 영향이 없다 (기준 5 — 확정 1)", () => {
    const received = stubFetch(() => envelopeResponse(CONSENTED_ME));
    renderScreen();

    fireEvent.click(marketingCheckbox());
    expect(marketingCheckbox().checked).toBe(true);
    expect(received.length).toBe(0);
    expect(ctaButton().disabled).toBe(false);

    // [필수] 해제 상태에서는 마케팅 체크가 있어도 CTA가 활성화되지 않는다
    fireEvent.click(requiredCheckbox());
    expect(ctaButton().disabled).toBe(true);
  });

  it("CTA 클릭 시 PUT /api/users/me/location-consent {consented: true}가 발사된다 (기준 8 발사부)", async () => {
    const received = stubFetch(() => envelopeResponse(CONSENTED_ME));
    renderScreen();

    fireEvent.click(ctaButton());

    await screen.findByRole("button", { name: "동의하고 시작하기" });
    expect(received.length).toBe(1);
    expect(new URL(received[0].request.url).pathname).toBe(
      "/api/users/me/location-consent",
    );
    expect(received[0].request.method).toBe("PUT");
    expect(received[0].body).toEqual({ consented: true });
  });

  it("PUT 실패 시 오류 안내가 표시되고 CTA 재시도가 가능하다 (기준 9)", async () => {
    const received = stubFetch(() => new Response(null, { status: 500 }));
    renderScreen();

    fireEvent.click(ctaButton());

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("실패");

    fireEvent.click(ctaButton());
    await waitFor(() => expect(received.length).toBe(2));
  });

  it("동의 화면은 브라우저 위치 권한(navigator.geolocation)을 요청하지 않는다 (기준 10 — 동의와 권한은 별개 층)", async () => {
    const getCurrentPosition = vi.fn();
    const watchPosition = vi.fn();
    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: { getCurrentPosition, watchPosition },
    });
    stubFetch(() => envelopeResponse(CONSENTED_ME));
    renderScreen();

    fireEvent.click(ctaButton());
    await screen.findByRole("button", { name: "동의하고 시작하기" });

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(watchPosition).not.toHaveBeenCalled();
  });

  it("로그아웃 클릭 시 logout API로 서버 세션을 무효화하고 로컬 세션 해제 후 onLoggedOut(홈 이동)이 불린다 (기준 11 — codex P1 반영)", async () => {
    // useLogout 관례(로컬 우선 종료): 봉투 없는 200 응답이면 onSettled에서 세션 해제
    const received = stubFetch(() => new Response(null, { status: 200 }));
    const onLoggedOut = renderScreen();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    // HttpOnly 리프레시 쿠키 무효화는 서버 몫 — logout API 호출이 그 전제 (codex P1)
    await waitFor(() =>
      expect(
        received.map(({ request }) => new URL(request.url).pathname),
      ).toContain("/api/auth/logout"),
    );
    await waitFor(() =>
      expect(useAuthStore.getState().isAuthenticated).toBe(false),
    );
    expect(onLoggedOut).toHaveBeenCalledTimes(1);
  });
});
