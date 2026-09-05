import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { renderWithProviders } from "@/test/render-with-providers";
import { stubFetch } from "@/test/stub-fetch";
import { ORG_CONSOLE } from "./console-config";
import { ConsoleShell } from "./ConsoleShell";

/**
 * 운영자 콘솔 사이드바 실데이터 (MSG-545 AC 10) — ORG 뱃지·이메일·"행사 등록 권한"
 * 안내 카드가 셸의 사이드바 슬롯에 실린다. 조직명은 서버 필드가 없어 미표시다(질문 1 (b)).
 */
const ORG_PROFILE = {
  email: "seomyeon@busan.go.kr",
  contactName: "김담당",
  contactPhone: "051-000-0000",
};

const renderOrgShell = () =>
  renderWithProviders(
    <Routes>
      <Route
        path={CONSOLE_ROUTES.orgHome}
        element={<ConsoleShell config={ORG_CONSOLE} />}
      >
        <Route index element={<p>신청 현황 본문</p>} />
      </Route>
    </Routes>,
    CONSOLE_ROUTES.orgHome,
  );

describe("운영자 콘솔 사이드바 실데이터 (AC 10)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("ORG 계정 뱃지·프로필 이메일·행사 등록 권한 안내가 사이드바에 보인다", async () => {
    signInForTest();
    stubFetch(() => envelopeResponse(ORG_PROFILE));
    renderOrgShell();

    expect(await screen.findByText("seomyeon@busan.go.kr")).toBeDefined();
    expect(screen.getByText("ORG 계정")).toBeDefined();
    expect(screen.getByText("행사 등록 권한")).toBeDefined();
  });

  it("프로필 조회가 실패해도 콘솔 제목·메뉴·뱃지는 정상 렌더된다", async () => {
    signInForTest();
    stubFetch(() => errorEnvelope(14403, "forbidden", 403));
    renderOrgShell();

    expect(await screen.findByText("ORG 계정")).toBeDefined();
    expect(screen.getByText("행사 운영자 콘솔")).toBeDefined();
    expect(screen.getByRole("button", { name: "신청 현황" })).toBeDefined();
    expect(screen.queryByText("seomyeon@busan.go.kr")).toBeNull();
  });
});
