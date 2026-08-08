import { StrictMode } from "react";
import { MemoryRouter } from "react-router-dom";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KAKAO_CALLBACK_PATH } from "@/app/routes";
import { oauthStateStorage } from "@/shared/storage";
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
      <MemoryRouter initialEntries={[`${KAKAO_CALLBACK_PATH}${search}`]}>
        <KakaoCallbackPage />
      </MemoryRouter>
    </StrictMode>,
  );

afterEach(() => {
  cleanup();
  oauthStateStorage.clear();
});

describe("카카오 콜백 페이지", () => {
  it("정상 콜백(코드 + 일치하는 state)은 StrictMode 이중 렌더에서도 인증 완료로 판정한다", () => {
    oauthStateStorage.save("STATE_TOKEN");

    renderCallback("?code=AUTH_CODE&state=STATE_TOKEN");

    expect(screen.getByText("카카오 인증이 완료됐어요")).toBeTruthy();
  });

  it("판정이 끝나면 state를 지운다 — 같은 인가 결과를 재사용할 수 없다", () => {
    oauthStateStorage.save("STATE_TOKEN");

    renderCallback("?code=AUTH_CODE&state=STATE_TOKEN");

    expect(oauthStateStorage.peek()).toBeNull();
  });

  it("state가 다르면 실패로 판정한다 — 내가 시작하지 않은 인가 결과", () => {
    oauthStateStorage.save("STATE_TOKEN");

    renderCallback("?code=AUTH_CODE&state=ATTACKER_STATE");

    expect(screen.getByText("로그인에 실패했어요")).toBeTruthy();
    expect(screen.getByText("인증 요청이 확인되지 않았어요")).toBeTruthy();
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
