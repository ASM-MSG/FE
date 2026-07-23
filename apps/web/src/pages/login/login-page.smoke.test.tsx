import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LoginPage } from "./LoginPage";

/**
 * 로그인 페이지 스모크 (MSG-46 스펙 구현 계획 — dex·profile smoke 관례).
 * 정적 카피·버튼 계약(AC 2·3·4·6·7)만 고정한다. 색·간격·pill 형태 등 픽셀 판정(AC 1·5·8)은
 * 브라우저 검증의 몫 — 스타일 단정은 넣지 않는다.
 * 카카오 버튼 클릭은 OAuth 연동 전까지 의도된 무동작이라, 후속 연동 티켓이 이 케이스를
 * "클릭 → 인가 리다이렉트"로 바꾸기 전까지 no-op 계약을 회귀 보호한다.
 */

/** 현재 경로 노출 대역 — no-op 클릭이 라우팅을 일으키지 않음을 단정하기 위한 관찰 지점 */
const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );

afterEach(cleanup);

describe("로그인 페이지 스모크", () => {
  it("타이틀 '필맵에 로그인'이 h1이고 서브카피가 보인다 (AC 2)", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "필맵에 로그인", level: 1 }),
    ).toBeTruthy();
    expect(screen.getByText("빠르고 간편하게 시작하세요")).toBeTruthy();
  });

  it("필맵 로고 이미지에 대체 텍스트가 있고 태그라인이 보인다 (AC 3)", () => {
    renderPage();

    expect(screen.getByRole("img", { name: "필맵 로고" })).toBeTruthy();
    expect(screen.getByText("기록하고, 모으고, 탐험하는 지도")).toBeTruthy();
  });

  it("버튼 위에 안내 문구 'SNS 계정으로 간편하게 시작해요'가 보인다 (AC 4)", () => {
    renderPage();

    expect(screen.getByText("SNS 계정으로 간편하게 시작해요")).toBeTruthy();
  });

  it("'카카오로 계속하기'는 실제 button이고, 클릭해도 라우트가 바뀌지 않는다 — 의도된 무동작 (AC 6)", () => {
    renderPage();

    const button = screen.getByRole("button", { name: "카카오로 계속하기" });
    expect(button.tagName).toBe("BUTTON");
    // type="button" — 폼 컨텍스트에 들어가도 submit 부작용이 없어야 한다
    expect(button.getAttribute("type")).toBe("button");

    fireEvent.click(button);
    expect(screen.getByTestId("location").textContent).toBe("/login");
  });

  it("약관 문구가 플레인 텍스트로 보인다 — 페이지에 링크가 없다 (AC 7)", () => {
    renderPage();

    expect(
      screen.getByText("로그인 시 서비스 약관과 개인정보 처리 방침에 동의합니다"),
    ).toBeTruthy();
    // 약관·처리방침 링크 연결은 제외 범위 — 링크로 렌더되면 계약 위반
    expect(screen.queryAllByRole("link")).toEqual([]);
  });
});
