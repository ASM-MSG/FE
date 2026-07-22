import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MOCK_PROFILE } from "@/entities/profile";
import { ProfilePanel } from "./ProfilePanel";

/**
 * 프로필 패널 스모크 (MSG-124 검증에서 승격 — 스펙 AC 1 "스모크 승격 후보" 표기, dex-panel.smoke 선례).
 * 후속 티켓([편집]·[로그아웃] 실동작, 설정 하위 페이지)이 전부 이 패널을 다시 여므로
 * 안정 흐름만 고정한다: 패널 열림·플레이스홀더 부재(AC 1), 비활성 행 계약(AC 7·10),
 * 정보 행 비포커스(AC 8), no-op 클릭이 URL을 바꾸지 않음(AC 7·9).
 * 스타일·간격 단정은 넣지 않는다 — 픽셀 판정은 브라우저 검증의 몫.
 */

/** 현재 경로 노출 대역 — no-op 클릭이 라우팅을 일으키지 않음을 단정하기 위한 관찰 지점 */
const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

const renderPanel = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route path="/profile" element={<ProfilePanel />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );

afterEach(cleanup);

describe("프로필 패널 스모크", () => {
  it("패널이 프로필 콘텐츠로 열리고 '준비 중인 페이지예요' 플레이스홀더가 없다 (AC 1·2·4)", async () => {
    renderPanel();

    expect(
      screen.getByRole("heading", { name: "프로필", level: 1 }),
    ).toBeTruthy();
    expect(await screen.findByText(MOCK_PROFILE.nickname)).toBeTruthy();
    expect(screen.getByText(`${MOCK_PROFILE.streakDays}일 연속`)).toBeTruthy();
    expect(screen.queryByText("준비 중인 페이지예요")).toBeNull();
  });

  it("비활성 › 행 5개는 포커스 가능한 button + aria-disabled + '준비 중' 캡션이다 (AC 7·10, A4)", async () => {
    renderPanel();
    await screen.findByText(MOCK_PROFILE.nickname);

    const disabledRows = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-disabled") === "true");
    expect(disabledRows.map((b) => b.textContent)).toEqual([
      "위치정보 동의 관리준비 중",
      "알림 설정준비 중",
      "신고 관리준비 중",
      "서비스 이용약관준비 중",
      "개인정보 처리방침준비 중",
    ]);
    // 네이티브 disabled가 아니라서 탭 순서에 남는다 (AC 10)
    for (const row of disabledRows) {
      expect((row as HTMLButtonElement).disabled).toBe(false);
    }
  });

  it("앱 버전 행은 버튼이 아닌 정보 행이다 — 포커스 대상 아님 (AC 8)", async () => {
    renderPanel();
    await screen.findByText(MOCK_PROFILE.nickname);

    expect(screen.getByText(MOCK_PROFILE.appVersion)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /앱 버전/ })).toBeNull();
  });

  it("행·[편집]·[로그아웃] 클릭은 no-op — URL이 /profile에서 바뀌지 않는다 (AC 7·9)", async () => {
    renderPanel();
    await screen.findByText(MOCK_PROFILE.nickname);

    fireEvent.click(screen.getByRole("button", { name: /위치정보 동의 관리/ }));
    fireEvent.click(screen.getByRole("button", { name: "편집" }));
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(screen.getByTestId("location").textContent).toBe("/profile");
    expect(screen.getByText(MOCK_PROFILE.nickname)).toBeTruthy();
  });
});
