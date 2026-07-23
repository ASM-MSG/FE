import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MOCK_PROFILE } from "@/entities/profile";
import { ProfilePanel } from "./ProfilePanel";

/**
 * 프로필 패널 스모크 (MSG-124 검증에서 승격 — 스펙 AC 1 "스모크 승격 후보" 표기, dex-panel.smoke 선례).
 * 후속 티켓([로그아웃] 실동작, 설정 하위 페이지)이 전부 이 패널을 다시 여므로
 * 안정 흐름만 고정한다: 패널 열림·플레이스홀더 부재(AC 1), 비활성 행 계약(AC 7·10),
 * 정보 행 비포커스(AC 8), no-op 클릭이 URL을 바꾸지 않음(AC 7·9).
 * [편집]은 MSG-125에서 프로필 편집 모달로 배선됨 — no-op 목록에서 제외하고
 * 모달 열림·초기값 채움을 별도 케이스로 고정한다 (MSG-125 AC 1·3).
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

  it("행·[로그아웃] 클릭은 no-op — URL이 /profile에서 바뀌지 않는다 (AC 7·9)", async () => {
    renderPanel();
    await screen.findByText(MOCK_PROFILE.nickname);

    fireEvent.click(screen.getByRole("button", { name: /위치정보 동의 관리/ }));
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(screen.getByTestId("location").textContent).toBe("/profile");
    expect(screen.getByText(MOCK_PROFILE.nickname)).toBeTruthy();
  });

  it("[편집] 클릭 시 '프로필 편집' 모달이 열리고 닉네임이 값으로 채워져 있다 — URL 불변 (MSG-125 AC 1·3)", async () => {
    renderPanel();
    await screen.findByText(MOCK_PROFILE.nickname);

    fireEvent.click(screen.getByRole("button", { name: "편집" }));

    // Radix Content(sr-only Title 참조)와 ModalCard(aria-label) 둘 다 dialog role —
    // ReportDialog 선례와 같은 중첩 구조라 접근성 이름 매치가 1개 이상이면 열린 것
    expect(
      screen.getAllByRole("dialog", { name: "프로필 편집" }).length,
    ).toBeGreaterThan(0);
    const nicknameInput = screen.getByLabelText("닉네임") as HTMLInputElement;
    expect(nicknameInput.value).toBe(MOCK_PROFILE.nickname);
    expect(screen.getByTestId("location").textContent).toBe("/profile");

    // [변경]은 순수 프레젠테이셔널 트리거 — 토글 시맨틱(aria-pressed) 미노출을 고정한다
    // (PR #22 리뷰 반영 — Chip 내부 스프레드 순서에 기대는 억제라 회귀 방지 필수)
    expect(
      screen.getByRole("button", { name: "변경" }).hasAttribute("aria-pressed"),
    ).toBe(false);
  });

  it("값 변경(닉네임·토글) 후 [취소] → 재오픈하면 초기값으로 복원된다 (MSG-125 AC 8)", async () => {
    renderPanel();
    await screen.findByText(MOCK_PROFILE.nickname);

    // 열고 닉네임·토글을 모두 변경한다 (mock 토글 초기값 true → "사용 중")
    fireEvent.click(screen.getByRole("button", { name: "편집" }));
    fireEvent.change(screen.getByLabelText("닉네임"), {
      target: { value: "바꾼닉네임" },
    });
    fireEvent.click(screen.getByRole("switch", { name: "위치정보 사용" }));
    expect(screen.getByText("사용 안 함")).toBeTruthy();

    // [취소]로 닫힘 — 모달이 사라진다
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.queryAllByRole("dialog", { name: "프로필 편집" })).toEqual(
      [],
    );

    // 재오픈 — 닉네임·토글이 초기값으로 복원되어 있다 (변경 미반영)
    fireEvent.click(screen.getByRole("button", { name: "편집" }));
    expect((screen.getByLabelText("닉네임") as HTMLInputElement).value).toBe(
      MOCK_PROFILE.nickname,
    );
    expect(
      screen
        .getByRole("switch", { name: "위치정보 사용" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(screen.getByText("사용 중")).toBeTruthy();
  });
});
