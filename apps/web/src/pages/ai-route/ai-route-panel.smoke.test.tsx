import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RequireAuth } from "@/app/RequireAuth";
import { useAiRouteStore } from "@/features/ai-route/model/ai-route-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { useMapOverlayStore } from "@/widgets/map-shell/map-overlay-store";
import type { MapShellContext } from "@/widgets/map-shell/use-map-shell";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { ROUTE_POINTS } from "@/test/route-points";
import { stubFetch } from "@/test/stub-fetch";
import { AiRoutePage } from "./AiRoutePage";

/**
 * AI 경로추천 패널 스모크 (MSG-488) — 로그인 게이트(L12)와 4상태·카드↔마커 배선(S2~S8)의
 * 사용자 관찰 가능한 계약만 고정한다. 문구·값 분기는 모델 유닛(route-*)이 덮는다.
 */
const moveTo = vi.fn();

/** MapShell이 Outlet context로 주는 지도 명령 API — 패널은 moveTo만 쓴다 */
const mapShellContext = {
  moveTo,
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  zoomTo: vi.fn(),
  fitBounds: vi.fn(),
  locate: vi.fn(),
} satisfies MapShellContext;

const renderPanel = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={["/ai-route"]}>
        <Routes>
          <Route element={<Outlet context={mapShellContext} />}>
            <Route
              path="/ai-route"
              element={
                <RequireAuth>
                  <AiRoutePage />
                </RequireAuth>
              }
            />
          </Route>
          <Route path="/" element={<p>지도 홈</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const recommendResponse = (notice: string | null = null) =>
  envelopeResponse({ points: ROUTE_POINTS, notice, mentionedArea: null });

const submitButton = () =>
  screen.getByRole("button", { name: /동선 짜기|다시 짜기|짜는 중/ });

const textarea = () =>
  screen.getByLabelText("하고 싶은 일 한 문장") as HTMLTextAreaElement;

/** 문장 입력 → 제출 — 결과·실패 케이스가 공유하는 진입 동작 */
const submitText = (value: string) => {
  fireEvent.change(textarea(), { target: { value } });
  fireEvent.click(submitButton());
};

beforeEach(() => {
  signInForTest();
  useLoginModalStore.setState({ open: false });
  useAiRouteStore.setState(useAiRouteStore.getInitialState(), true);
  useMapOverlayStore.setState(useMapOverlayStore.getInitialState(), true);
  // 지도 준비 완료 — 요청 뷰포트의 근원 (부산 서면)
  useViewportStore.setState({
    bounds: {
      sw: { lat: 35.1521, lng: 129.0537 },
      ne: { lat: 35.1662, lng: 129.0712 },
    },
  });
  moveTo.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("로그인 게이트 (L12)", () => {
  it("비로그인으로 직접 진입하면 패널 콘텐츠가 렌더되지 않고 로그인 모달이 열린다 (L12)", () => {
    signOutForTest();

    renderPanel();

    expect(screen.queryByRole("button", { name: "동선 짜기" })).toBeNull();
    expect(screen.getByText("지도 홈")).toBeTruthy();
    expect(useLoginModalStore.getState().open).toBe(true);
  });
});

describe("입력 대기 (S2·S3)", () => {
  it("안내 문구와 예시 칩 2개가 뜨고 빈 입력이라 제출 버튼이 비활성이다 (S2)", () => {
    renderPanel();

    expect(
      screen.getByText("지금 보이는 지도 범위에서 동선을 짜 드려요"),
    ).toBeTruthy();
    expect(screen.getByText("이렇게 물어보세요")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "서면에서 밥 먹고 저녁 경기까지 동선 짜 줘",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "지금 하는 축제 위주로 반나절 코스" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "동선 짜기" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("예시 칩을 누르면 그 문장이 입력창에 채워지고 제출 버튼이 활성화된다 (S3)", () => {
    renderPanel();

    fireEvent.click(
      screen.getByRole("button", { name: "지금 하는 축제 위주로 반나절 코스" }),
    );

    expect(textarea().value).toBe("지금 하는 축제 위주로 반나절 코스");
    expect(
      screen
        .getByRole("button", { name: "동선 짜기" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });
});

describe("요청 → 결과 (S4·S5·S6·S9)", () => {
  it("제출하면 상태줄이 '동선 찾는 중'이 되고 버튼이 '짜는 중…'으로 잠긴다 (S4)", async () => {
    stubFetch(
      () => new Promise<Response>(() => undefined) as unknown as Response,
    );
    renderPanel();

    submitText("서면에서 밥 먹고 저녁 경기까지");

    await waitFor(() =>
      expect(screen.getByText("· 동선 찾는 중")).toBeTruthy(),
    );
    expect(
      screen.getByRole("button", { name: "짜는 중…" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("결과가 오면 지점 카드와 개수 상태줄이 뜨고 지도에 경로·격자가 게시된다 (S5·S6)", async () => {
    stubFetch(() => recommendResponse());
    renderPanel();

    submitText("서면 동선");

    await waitFor(() => expect(screen.getByText("· 3곳")).toBeTruthy());
    expect(screen.getByRole("button", { name: /서면 지점 1/ })).toBeTruthy();
    expect(useMapOverlayStore.getState().routes).toHaveLength(1);
    expect(useMapOverlayStore.getState().cells).toHaveLength(3);
    expect(useMapOverlayStore.getState().onRouteWaypointClick).toBeTruthy();
  });

  it("notice가 있으면 실제 카드 수를 담은 부족 배너가 리스트 위에 뜬다 (S9)", async () => {
    stubFetch(() => recommendResponse("후보가 부족합니다"));
    renderPanel();

    submitText("서면 동선");

    await waitFor(() =>
      expect(screen.getByText(/조건에 맞는 곳을 3곳만 찾았어요/)).toBeTruthy(),
    );
    expect(screen.queryByText("후보가 부족합니다")).toBeNull();
  });
});

describe("카드↔마커 연동 (S8)", () => {
  it("카드를 누르면 그 지점으로 지도가 이동하고 해당 마커가 강조된다 (S8)", async () => {
    stubFetch(() => recommendResponse());
    renderPanel();

    submitText("서면 동선");
    await waitFor(() => expect(screen.getByText("· 3곳")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /서면 지점 2/ }));

    expect(moveTo).toHaveBeenCalledWith({
      lat: ROUTE_POINTS[1].lat,
      lng: ROUTE_POINTS[1].lng,
    });
    await waitFor(() =>
      expect(
        useMapOverlayStore
          .getState()
          .routes[0].waypoints.map((waypoint) => waypoint.active === true),
      ).toEqual([false, true, false]),
    );
  });

  it("마커를 누르면 지도 이동 없이 그 카드가 선택 표시된다 (S8)", async () => {
    stubFetch(() => recommendResponse());
    renderPanel();

    submitText("서면 동선");
    await waitFor(() => expect(screen.getByText("· 3곳")).toBeTruthy());

    useMapOverlayStore.getState().onRouteWaypointClick?.("ai-route", 3);

    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: /서면 지점 3/ })
          .getAttribute("aria-pressed"),
      ).toBe("true"),
    );
    expect(moveTo).not.toHaveBeenCalled();
  });
});

describe("실패 경로 (S10)", () => {
  it("14503(기능 꺼짐)은 재시도 행 없이 문구만 남기고 제출 버튼이 계속 비활성이다 (S10)", async () => {
    stubFetch(() => errorEnvelope(14503, "기능이 꺼져 있습니다", 503));
    renderPanel();

    submitText("서면 동선");

    await waitFor(() =>
      expect(screen.getByText("지금은 경로 추천을 쓸 수 없어요")).toBeTruthy(),
    );
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "다시 짜기" })
        .hasAttribute("disabled"),
    ).toBe(true);
    // 입력 문장은 어떤 실패에서도 지워지지 않는다 (§1-4)
    expect(textarea().value).toBe("서면 동선");
  });

  it("14400(뷰포트)은 재시도 행이 뜨고 제출 버튼이 살아 있다 (S10)", async () => {
    stubFetch(() => errorEnvelope(14400, "뷰포트가 너무 넓습니다", 400));
    renderPanel();

    submitText("서면 동선");

    await waitFor(() =>
      expect(
        screen.getByText(
          "지도를 조금 더 확대하거나 다른 곳으로 옮긴 뒤 다시 시도해 주세요",
        ),
      ).toBeTruthy(),
    );
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "다시 짜기" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });
});
