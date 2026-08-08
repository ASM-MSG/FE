import { Outlet, Route, Routes } from "react-router-dom";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import { envelopeResponse } from "@/test/envelope-response";
import { renderWithProviders } from "@/test/render-with-providers";
import { MapHomePage } from "./MapHomePage";

/**
 * 좌측 패널 분기 스모크 (MSG-325 리뷰 반영).
 * 분기 우선순위는 **선택 컨텍스트(selectedCellId)** 기준이어야 한다 — 상세 데이터(detail)
 * 기준으로 분기하면, 격자를 바꿔 탭할 때 새 응답이 오기 전 상세 자리가 요약 패널로
 * 튀었다가 되돌아온다(entityQueryPolicy로 placeholderData를 뺀 뒤의 부작용).
 */
const SEOMYEON = "39064_112221";

/** 지도 명령 API는 이 화면의 분기와 무관 — Outlet context 계약만 만족시킨다 */
const mapShellStub = {
  moveTo: () => {},
  zoomIn: () => {},
  zoomOut: () => {},
  locate: () => {},
};

const ShellStub = () => <Outlet context={mapShellStub} />;

const renderHome = () =>
  renderWithProviders(
    <Routes>
      <Route element={<ShellStub />}>
        <Route path="/" element={<MapHomePage />} />
      </Route>
    </Routes>,
  );

/** 격자 상세 응답만 보류시켜 "선택은 됐는데 데이터는 아직" 상태를 만든다 */
const stubDetail = (pending: boolean) => {
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: Request) => Promise<Response>>(async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname.startsWith("/api/grids/")) {
        if (pending) return new Promise<Response>(() => {});
        if (pathname.endsWith("/cover")) return envelopeResponse(null);
        return envelopeResponse({
          gridId: SEOMYEON,
          occupied: true,
          videoCount: 4,
          zoneName: "서면",
          zoneCell: "A-14",
        });
      }
      if (pathname === "/api/grids") {
        return envelopeResponse({ grids: [], nextCursor: null });
      }
      return envelopeResponse({ hotZones: [] });
    }),
  );
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useHomeCellDetailStore.setState({ selectedCellId: null });
  useThemeFilterStore.setState({ activeTheme: null });
});

describe("홈 좌측 패널 분기", () => {
  it("선택한 격자가 있으면 상세 데이터가 아직 없어도 요약 패널로 되돌아가지 않는다", async () => {
    stubDetail(true);
    useHomeCellDetailStore.setState({ selectedCellId: SEOMYEON });

    renderHome();

    expect(await screen.findByText(/격자 정보를 불러오는 중/)).toBeTruthy();
    // 요약 패널의 어느 상태(정상·로딩·에러)도 이 자리에 나오면 안 된다
    expect(screen.queryByText(/이 지역 격자/)).toBeNull();
    expect(screen.queryByText(/이 지역 정보를 불러오는 중/)).toBeNull();
  });

  it("상세 응답이 도착하면 상세 패널로 전환된다", async () => {
    stubDetail(false);
    useHomeCellDetailStore.setState({ selectedCellId: SEOMYEON });

    renderHome();

    expect(await screen.findByText("서면 A-14")).toBeTruthy();
    expect(screen.getByText("내 영상 4개")).toBeTruthy();
  });

  it("선택이 없으면 요약 패널 자리다 (기존 분기 보존)", async () => {
    stubDetail(false);

    renderHome();

    // 이 하네스에는 지도가 없어 뷰포트 bounds가 비어 있다 — 요약 패널의 로딩 상태가 정상
    await waitFor(() =>
      expect(screen.getByText(/이 지역 정보를 불러오는 중/)).toBeTruthy(),
    );
    expect(screen.queryByText(/격자 정보를 불러오는 중/)).toBeNull();
  });
});
