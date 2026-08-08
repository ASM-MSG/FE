import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { KAKAO_CALLBACK_PATH } from "@/app/routes";
import { deviceIdStorage, oauthStateStorage } from "@/shared/storage";
import { KakaoCallbackPage } from "./KakaoCallbackPage";

/**
 * 카카오 콜백 페이지 스모크 (MSG-325).
 * **StrictMode로 렌더한다** — 앱 진입점(main.tsx)이 StrictMode라 렌더·초기화가 2회 실행된다.
 * state 소비를 렌더 중에 하면 두 번째 실행에서 값이 사라져 정상 콜백이 CSRF 실패로 판정된다
 * (리뷰 지적 재현). 판정은 렌더에 대해 멱등해야 한다.
 */
const renderCallback = (search: string) =>
  render(
    <StrictMode>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[`${KAKAO_CALLBACK_PATH}${search}`]}>
          <KakaoCallbackPage />
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  );

/** 코드 교환 응답 목 — 봉투 + accessToken (웹은 refreshToken이 null) */
const stubExchange = (body: object, status = 200, deviceId?: string) => {
  const fetchMock = vi.fn<(input: Request) => Promise<Response>>(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: {
          "Content-Type": "application/json",
          ...(deviceId !== undefined && { "X-Device-Id": deviceId }),
        },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  oauthStateStorage.clear();
  deviceIdStorage.clear();
  useAuthStore.setState({ accessToken: null, isAuthenticated: false });
});

describe("카카오 콜백 페이지", () => {
  it("정상 콜백은 StrictMode 이중 렌더에서도 코드를 1회만 교환한다 — 인가 코드는 1회용이라 재전송이 2423을 부른다", async () => {
    oauthStateStorage.save("STATE_TOKEN");
    const fetchMock = stubExchange({
      developCode: 0,
      message: "ok",
      data: { accessToken: "kakao-access-token", refreshToken: null },
    });

    renderCallback("?code=AUTH_CODE&state=STATE_TOKEN");

    await waitFor(() =>
      expect(useAuthStore.getState().isAuthenticated).toBe(true),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(fetchMock.mock.calls[0][0].url).pathname).toBe(
      "/api/auth/oauth/kakao/code",
    );
  });

  it("응답 헤더의 X-Device-Id를 저장한다 — 이후 요청에 재사용된다", async () => {
    oauthStateStorage.save("STATE_TOKEN");
    stubExchange(
      {
        developCode: 0,
        message: "ok",
        data: { accessToken: "kakao-access-token", refreshToken: null },
      },
      200,
      "device-from-server",
    );

    renderCallback("?code=AUTH_CODE&state=STATE_TOKEN");

    await waitFor(() =>
      expect(deviceIdStorage.get()).toBe("device-from-server"),
    );
  });

  it("서버가 2423을 주면 처음부터 다시 로그인하라고 안내한다", async () => {
    oauthStateStorage.save("STATE_TOKEN");
    stubExchange(
      { developCode: 2423, message: "인가 코드 만료", data: null },
      401,
    );

    renderCallback("?code=AUTH_CODE&state=STATE_TOKEN");

    expect(await screen.findByText("다시 로그인해주세요")).toBeTruthy();
  });

  it("서버가 2502를 주면 잠시 후 재시도하라고 안내한다", async () => {
    oauthStateStorage.save("STATE_TOKEN");
    stubExchange(
      { developCode: 2502, message: "카카오 장애", data: null },
      502,
    );

    renderCallback("?code=AUTH_CODE&state=STATE_TOKEN");

    expect(await screen.findByText("잠시 후 다시 시도해주세요")).toBeTruthy();
  });

  it("판정이 끝나면 state를 지운다 — 같은 인가 결과를 재사용할 수 없다", () => {
    oauthStateStorage.save("STATE_TOKEN");
    stubExchange({ developCode: 0, message: "ok", data: {} });

    renderCallback("?code=AUTH_CODE&state=STATE_TOKEN");

    expect(oauthStateStorage.peek()).toBeNull();
  });

  it("state가 다르면 코드를 교환하지 않는다 — 내가 시작하지 않은 인가 결과", () => {
    oauthStateStorage.save("STATE_TOKEN");
    const fetchMock = stubExchange({ developCode: 0, message: "ok", data: {} });

    renderCallback("?code=AUTH_CODE&state=ATTACKER_STATE");

    expect(screen.getByText("로그인에 실패했어요")).toBeTruthy();
    expect(screen.getByText("인증 요청이 확인되지 않았어요")).toBeTruthy();
    // 교환 요청 자체가 나가지 않아야 한다 (스토어 단정은 앞선 케이스의 늦은 응답에 오염될 수 있어 요청으로 고정)
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("사용자가 동의를 취소하면 실패가 아니라 취소로 안내한다", () => {
    renderCallback("?error=access_denied");

    expect(screen.getByText("카카오 로그인을 취소했어요")).toBeTruthy();
  });

  it("코드도 에러도 없는 직접 진입은 잘못된 접근이다", () => {
    renderCallback("");

    expect(screen.getByText("로그인에 실패했어요")).toBeTruthy();
    expect(screen.getByText("잘못된 접근이에요")).toBeTruthy();
  });
});
