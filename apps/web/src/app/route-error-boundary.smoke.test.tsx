import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { redirectTo } from "@/shared/navigation";
import { ROUTES } from "./routes";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

// 하드 이동은 어댑터(redirectTo = window.location.assign) 경유 — jsdom은 location.assign
// 재정의를 막으므로 어댑터를 목한다 (login-modal.smoke 관례)
vi.mock("@/shared/navigation", () => ({ redirectTo: vi.fn() }));

/**
 * 루트 에러 화면 스모크 (MSG-477 ② B1).
 * "홈으로"는 라우터 navigate가 아니라 **하드 이동**(window.location.assign)이어야 한다 —
 * errorElement의 에러 상태는 location이 바뀔 때만 리셋되므로, 홈 URL 자체에서 에러가 난
 * same-location 케이스는 navigate("/")로 복구되지 않는다. 문서 리로드는 라우터·React·모듈
 * 상태를 전부 초기화해 두 케이스(무매칭 404·홈 에러)를 모두 덮는다.
 * 라우터 컨텍스트 없이 렌더되는 것 자체가 useNavigate 미사용의 구조적 증거다.
 */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("루트 에러 화면 (MSG-477 ②)", () => {
  it("'홈으로' 클릭 시 홈 URL로 하드 이동한다 — window.location.assign 경유, 라우터 navigate 미사용 (B1)", () => {
    render(<RouteErrorBoundary />);

    expect(screen.getByText("문제가 생겼어요")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "홈으로" }));

    expect(redirectTo).toHaveBeenCalledExactlyOnceWith(ROUTES.home);
  });
});
