import { Outlet, Route, Routes } from "react-router-dom";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { useMissionSelectionStore } from "@/features/map-home/model/mission-selection-store";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { useRegionPanelStore } from "@/features/region/model/region-panel-store";
import { useCommittedRegionBootstrap } from "@/features/region/model/use-committed-region";
import { SEOMYEON_CENTER } from "@/shared/geolocation";
import { useMapOverlayStore } from "@/widgets/map-shell/map-overlay-store";
import { useSidebarStore } from "@/widgets/map-shell/sidebar-store";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { READY_PLAYBACK } from "@/test/playback-fixture";
import { renderWithProviders } from "@/test/render-with-providers";
import { MapHomePage } from "./MapHomePage";

/**
 * 좌측 패널 분기 스모크 (MSG-325 리뷰 반영 → MSG-328 지역 패널 교체).
 * 분기 우선순위는 **선택 컨텍스트(selectedCellId)** 기준이어야 한다 — 상세 데이터(detail)
 * 기준으로 분기하면, 격자를 바꿔 탭할 때 새 응답이 오기 전 상세 자리가 기본 패널로
 * 튀었다가 되돌아온다(entityQueryPolicy로 placeholderData를 뺀 뒤의 부작용).
 * 기본 분기는 MSG-328에서 요약 패널(CellSummaryPanel) → 지역 격자 리스트(RegionPanel)로
 * 교체됐다 — 관련 단정도 함께 갱신 (AC 18 보존 + AC 4·5·12 신규).
 */
const SEOMYEON = "39064_112221";

/** reverse-geocode 응답 — 서면 좌표의 행정동 (지명은 서면 기준, MVP 지역) */
const BUJEON_REGION = {
  regionCode: "2644056000",
  regionName: "부전제1동",
  parentCode: "2644000000",
};

/** 지역 격자 카드 응답 — 서면 A-14 1장 */
const REGION_GRIDS = {
  regionCode: "2644056000",
  regionName: "부전제1동",
  gridCount: 1,
  videoCount: 138,
  grids: [
    {
      gridId: SEOMYEON,
      gridY: 39064,
      gridX: 112221,
      videoCount: 138,
      coverThumbnailUrl: null,
      coverDurationSec: 84,
      zoneName: "서면",
      zoneCell: "A-14",
    },
  ],
};

/** 지도 명령 API — moveTo는 격자 카드 클릭의 지도 이동 배선 단정용 스파이 (사용자 보완 2) */
const mapShellStub = {
  moveTo: vi.fn(),
  zoomIn: () => {},
  zoomOut: () => {},
  zoomTo: vi.fn(),
  locate: () => {},
};

/** 셸이 하는 일 중 홈이 의존하는 것 — 지도 명령 주입 + 확정 지역 최초 채택 (MSG-403 AC 9) */
const ShellStub = () => {
  useCommittedRegionBootstrap();
  return <Outlet context={mapShellStub} />;
};

/** 지도 준비 완료 상태 — 확정 영역은 뷰포트가 들어와야 잡힌다 (MSG-403 AC 9) */
const READY_BOUNDS = {
  sw: { lat: 35.153, lng: 129.053 },
  ne: { lat: 35.163, lng: 129.065 },
};

const renderHome = () => {
  useViewportStore.setState({ bounds: READY_BOUNDS });
  return renderWithProviders(
    <Routes>
      <Route element={<ShellStub />}>
        <Route path="/" element={<MapHomePage />} />
      </Route>
    </Routes>,
  );
};

/** 지역 패널은 비로그인 조회 게이트(익명 401 실측)가 있어 로그인 상태로 검증한다 */
const authenticate = signInForTest;

/**
 * 격자 상세 응답만 모드별로 갈아끼운다 — 뷰포트·핫구역·지역 API는 항상 고정 응답.
 * "선택은 됐는데 데이터는 아직"(pending)과 조회 실패(error)를 같은 스텁으로 만든다.
 * region 옵션 — reverse-geocode 응답 data (null = 바다·행정동 밖, AC 12).
 */
const stubDetail = (
  mode: "ready" | "pending" | "error",
  occupiedGridIds: string[] = [],
  region: () => typeof BUJEON_REGION | null = () => BUJEON_REGION,
  gridVideos: unknown[] = [],
) => {
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: Request) => Promise<Response>>(async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/regions/reverse-geocode") {
        return envelopeResponse(region());
      }
      if (/^\/api\/regions\/.+\/grids$/.test(pathname)) {
        return envelopeResponse(REGION_GRIDS);
      }
      // MSG-395: 홈이 상시 조회하는 미션·수집 격자 (칩 미선택 분기 단정과는 무관하나,
      // 응답 모양이 없으면 파생이 터져 패널 자체가 렌더되지 않는다)
      if (pathname === "/api/missions/active") return envelopeResponse([]);
      if (pathname === "/api/collections/grids") return envelopeResponse([]);
      if (pathname === "/api/collections/videos") return envelopeResponse([]);
      // 단건 재생 조회 — 미니 패널 자동 재생 흐름 (사용자 보완 2)
      if (pathname.startsWith("/api/videos/")) {
        return envelopeResponse({ ...READY_PLAYBACK, videoId: 501 });
      }
      if (pathname.startsWith("/api/grids/")) {
        // MSG-395: 격자 상세가 시간대 그래프를 함께 조회한다 (표본 0이면 그래프 미표시)
        if (pathname.endsWith("/hourly-uploads"))
          return envelopeResponse({ gridId: SEOMYEON, hours: [] });
        if (mode === "pending") return new Promise<Response>(() => {});
        if (mode === "error") return new Response(null, { status: 500 });
        // MSG-326: 상세 패널이 영상 목록 2종을 함께 조회한다 (분기 단정과 무관)
        if (pathname.endsWith("/my-videos")) return envelopeResponse([]);
        if (pathname.endsWith("/videos")) {
          return envelopeResponse({
            videos: gridVideos,
            hasNext: false,
            nextCursor: null,
          });
        }
        return envelopeResponse({
          gridId: SEOMYEON,
          occupied: true,
          videoCount: 4,
          zoneName: "서면",
          zoneCell: "A-14",
        });
      }
      if (pathname === "/api/grids") {
        return envelopeResponse({
          grids: occupiedGridIds.map((gridId) => ({ gridId })),
          nextCursor: null,
        });
      }
      return envelopeResponse({ hotZones: [] });
    }),
  );
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  mapShellStub.moveTo.mockClear();
  useHomeCellDetailStore.setState({ selectedCellId: null });
  useThemeFilterStore.setState({ activeTheme: null });
  useMissionSelectionStore.setState(
    useMissionSelectionStore.getInitialState(),
    true,
  );
  useSidebarStore.setState({ collapsed: false });
  useViewportStore.setState({ bounds: null, center: SEOMYEON_CENTER });
  useVideoMiniPanelStore.setState({ selected: null });
  signOutForTest();
  useRegionPanelStore.setState(useRegionPanelStore.getInitialState(), true);
});

describe("홈 좌측 패널 분기", () => {
  it("선택한 격자가 있으면 상세 데이터가 아직 없어도 지역 패널로 되돌아가지 않는다", async () => {
    stubDetail("pending");
    authenticate();
    useHomeCellDetailStore.setState({ selectedCellId: SEOMYEON });

    renderHome();

    expect(
      await screen.findByRole("status", { name: "격자 정보 불러오는 중" }),
    ).toBeTruthy();
    // 지역 패널의 어느 상태(정상·로딩·빈)도 이 자리에 나오면 안 된다
    expect(screen.queryByText("부전제1동")).toBeNull();
    expect(
      screen.queryByRole("status", { name: "현재 지역 확인 중" }),
    ).toBeNull();
  });

  it("상세 응답이 도착하면 상세 패널로 전환된다", async () => {
    stubDetail("ready");
    useHomeCellDetailStore.setState({ selectedCellId: SEOMYEON });

    renderHome();

    expect(await screen.findByText("서면 A-14")).toBeTruthy();
    expect(screen.getByText("내 영상 4개")).toBeTruthy();
  });

  it("격자 조회가 실패하면 로딩이 아니라 실패로 알리고 재시도를 준다 (리뷰 반영)", async () => {
    stubDetail("error");
    useHomeCellDetailStore.setState({ selectedCellId: SEOMYEON });

    renderHome();

    expect(
      await screen.findByText(/격자 정보를 불러오지 못했어요/, undefined, {
        timeout: 5000,
      }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeTruthy();
    expect(
      screen.queryByRole("status", { name: "격자 정보 불러오는 중" }),
    ).toBeNull();
  });

  /** 로그인 상태로 홈을 띄우고 초기 지역 패널(헤더·격자 카드) 도착을 기다린다 — 지역 흐름 공용 셋업 */
  const renderRegionHome = async () => {
    authenticate();
    renderHome();
    expect(await screen.findByText("부전제1동")).toBeTruthy();
    expect(await screen.findByText("서면 A-14")).toBeTruthy();
  };

  it("선택이 없으면 지역 격자 리스트 자리다 — 행정동 헤더 + 격자 카드 (AC 4·5·18)", async () => {
    stubDetail("ready");

    await renderRegionHome();

    expect(screen.getByText("138개 영상")).toBeTruthy();
  });

  it("상세를 닫으면 지역 격자 리스트로 복귀한다 (AC 18)", async () => {
    stubDetail("ready");
    authenticate();
    useHomeCellDetailStore.setState({ selectedCellId: SEOMYEON });

    renderHome();
    expect(await screen.findByText("내 영상 4개")).toBeTruthy();

    act(() => useHomeCellDetailStore.getState().close());

    expect(await screen.findByText("부전제1동")).toBeTruthy();
    expect(screen.queryByText("내 영상 4개")).toBeNull();
  });

  it("표시 지역이 있는 상태에서 지도 이동 후 행정동 조회가 실패하면 조용히 숨기지 않고 재시도를 준다 (리뷰 P2)", async () => {
    // 최초 조회는 성공(지역 채택), 이후 조회는 실패 — 이동 후 일시 장애 시나리오
    let reverseFails = false;
    vi.stubGlobal(
      "fetch",
      vi.fn<(input: Request) => Promise<Response>>(async (request) => {
        const { pathname } = new URL(request.url);
        if (pathname === "/api/regions/reverse-geocode") {
          if (reverseFails) return new Response(null, { status: 500 });
          return envelopeResponse(BUJEON_REGION);
        }
        if (/^\/api\/regions\/.+\/grids$/.test(pathname)) {
          return envelopeResponse(REGION_GRIDS);
        }
        // MSG-395: 홈 상시 조회 (이 테스트의 단정과는 무관하나 응답 모양이 필요하다)
        if (pathname === "/api/missions/active") return envelopeResponse([]);
        if (pathname === "/api/collections/grids") return envelopeResponse([]);
        if (pathname === "/api/grids") {
          return envelopeResponse({ grids: [], nextCursor: null });
        }
        return envelopeResponse({ hotZones: [] });
      }),
    );
    authenticate();

    renderHome();
    expect(await screen.findByText("부전제1동")).toBeTruthy();

    reverseFails = true;
    act(() => useViewportStore.setState({ center: { lat: 35.2, lng: 129.2 } }));

    // 디바운스(500ms) 뒤 새 중심 조회가 실패한다 — 이전 지역 헤더·리스트는 유지하되
    // 실패·재시도 표면이 노출돼 "장소 불러오기" 흐름이 복구 가능해야 한다
    expect(
      await screen.findByText(/현재 지역을 확인하지 못했어요/, undefined, {
        timeout: 3000,
      }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeTruthy();
    expect(screen.getByText("부전제1동")).toBeTruthy();
  });

  it("지도를 이동해도 헤더 행정동과 격자 리스트는 확정 지역 그대로이고 재검색 버튼만 뜬다 (MSG-403 AC 11·13)", async () => {
    // 이동 후 중심의 행정동이 부전제2동으로 바뀌는 시나리오 — 가변 스텁
    let reverseRegion = BUJEON_REGION;
    stubDetail("ready", [], () => reverseRegion);
    await renderRegionHome();

    reverseRegion = {
      regionCode: "2644057000",
      regionName: "부전제2동",
      parentCode: "2644000000",
    };
    act(() => useViewportStore.setState({ center: { lat: 35.2, lng: 129.2 } }));

    // 재검색 버튼이 새 행정동 라벨로 뜬다 — 갱신 수단은 이 버튼뿐이다
    expect(
      await screen.findByRole(
        "button",
        { name: /부전제2동 장소 불러오기/ },
        { timeout: 3000 },
      ),
    ).toBeTruthy();
    // 헤더·격자 리스트는 확정 지역(부전제1동) 그대로 — 지도 이동은 화면을 바꾸지 않는다
    expect(screen.getByRole("heading", { name: "부전제1동" })).toBeTruthy();
    expect(screen.getByText("서면 A-14")).toBeTruthy();
  });

  it("장소 불러오기를 누르면 그 행정동으로 확정돼 헤더가 바뀐다 (MSG-403 AC 11)", async () => {
    let reverseRegion = BUJEON_REGION;
    stubDetail("ready", [], () => reverseRegion);
    await renderRegionHome();

    reverseRegion = {
      regionCode: "2644057000",
      regionName: "부전제2동",
      parentCode: "2644000000",
    };
    act(() => useViewportStore.setState({ center: { lat: 35.2, lng: 129.2 } }));
    fireEvent.click(
      await screen.findByRole(
        "button",
        { name: /부전제2동 장소 불러오기/ },
        { timeout: 3000 },
      ),
    );

    expect(
      await screen.findByRole("heading", { name: "부전제2동" }),
    ).toBeTruthy();
  });

  /** 격자 영상 1건 스텁으로 홈을 띄우고 서면 카드 클릭까지 진행한다 — 카드 재생 흐름 공용 셋업 */
  const clickSeomyeonCard = async () => {
    stubDetail("ready", [], () => BUJEON_REGION, [
      {
        videoId: 501,
        thumbnailUrl: "data:,thumb",
        durationSec: 24,
        viewCount: 10,
        recordedAt: "2026-08-01T00:00:00Z",
        nickname: "필맵퍼",
      },
    ]);
    await renderRegionHome();
    fireEvent.click(screen.getByRole("button", { name: /서면 A-14/ }));
  };

  it("격자 카드를 클릭하면 상세를 열지 않고 지역 리스트를 유지한 채 오른쪽 미니 패널에서 첫 영상이 재생된다 (사용자 피드백 — 상세 미오픈)", async () => {
    await clickSeomyeonCard();

    // 오른쪽 미니 패널만 뜬다 — 좌측은 동 헤더 + 격자 카드 리스트(RegionPanel) 그대로
    expect(await screen.findByLabelText("영상 미니 패널")).toBeTruthy();
    expect(screen.getByText("부전제1동")).toBeTruthy();
    expect(screen.getByRole("button", { name: /서면 A-14/ })).toBeTruthy();
    // 격자 상세(영상 추가·공유·저장 UI 포함)는 열리지 않는다
    expect(screen.queryByText("내 영상 4개")).toBeNull();
    // 지도는 움직이지 않는다 (사용자 피드백 — moveTo 제거)
    expect(mapShellStub.moveTo).not.toHaveBeenCalled();
  });

  it("카드 재생 중 격자는 지도에 테두리 강조로 게시되고, 미니 패널을 닫으면 해제된다 (사용자 피드백)", async () => {
    await clickSeomyeonCard();

    await waitFor(() =>
      expect(
        useMapOverlayStore
          .getState()
          .cells.some((cell) => cell.id === SEOMYEON && cell.emphasized),
      ).toBe(true),
    );

    act(() => useVideoMiniPanelStore.getState().close());

    await waitFor(() =>
      expect(
        useMapOverlayStore.getState().cells.some((cell) => cell.emphasized),
      ).toBe(false),
    );
  });

  it("지도 중심이 행정동 밖(data null)이면 빈 상태 안내가 뜬다 (AC 12)", async () => {
    stubDetail("ready", [], () => null);
    authenticate();

    renderHome();

    expect(await screen.findByText(/행정동이 없어요/)).toBeTruthy();
    expect(screen.queryByText("부전제1동")).toBeNull();
  });

  it("비로그인이면 지역 조회 대신 로그인 유도를 보여준다 (익명 401 실측 — 리스크 결정)", async () => {
    const fetchSpy = vi.fn<(input: Request) => Promise<Response>>();
    vi.stubGlobal("fetch", fetchSpy);

    renderHome();

    expect(await screen.findByRole("button", { name: "로그인" })).toBeTruthy();
    // 지역·격자 조회가 발사되지 않는다 — 401 → 세션 만료 오작동 방지 게이트
    expect(
      fetchSpy.mock.calls.filter(([request]) =>
        new URL(request.url).pathname.startsWith("/api/regions"),
      ),
    ).toHaveLength(0);
  });
});

describe("접힘 상태 셀 탭 → 패널 펼침 (사용자 결정 2026-08-10)", () => {
  /** 접힘 + 서면 점령 1건 뷰포트로 홈을 띄우고 셀 클릭 핸들러 등록을 기다린다 */
  const renderCollapsedHome = async () => {
    stubDetail("ready", [SEOMYEON]);
    // 점령 격자 조회가 인증 게이트를 갖게 됨(MSG-328 사용자 버그 리포트) — 탭 판정의
    // 전제인 점령 목록이 로그인 상태에서만 도착하므로 로그인 전제로 고정
    authenticate();
    useSidebarStore.setState({ collapsed: true });
    useViewportStore.setState({
      bounds: {
        sw: { lat: 35.15, lng: 129.05 },
        ne: { lat: 35.16, lng: 129.06 },
      },
    });
    renderHome();
    await waitFor(() =>
      expect(useMapOverlayStore.getState().onCellClick).toBeTruthy(),
    );
  };

  it("사이드바가 접혀 있어도 점령 셀을 탭하면 펼쳐지고 상세가 열린다", async () => {
    await renderCollapsedHome();

    // 점령 조회 도착 전에는 탭 판정이 통과하지 못한다 — 통과해 펼쳐질 때까지 재시도
    await waitFor(() => {
      act(() => useMapOverlayStore.getState().onCellClick?.(SEOMYEON));
      expect(useSidebarStore.getState().collapsed).toBe(false);
    });
    expect(await screen.findByText("서면 A-14")).toBeTruthy();
  });

  it("판정 미통과(비점령) 셀 탭은 접힘을 해제하지 않는다", async () => {
    await renderCollapsedHome();

    act(() => useMapOverlayStore.getState().onCellClick?.("0_0"));
    expect(useSidebarStore.getState().collapsed).toBe(true);
    expect(useHomeCellDetailStore.getState().selectedCellId).toBeNull();
  });
});

describe("칩 선택 상태의 패널 분기 (MSG-395, codex 리뷰 반영)", () => {
  it("고른 미션이 목록에서 사라지면 지역 패널이 아니라 그 칩의 목록으로 돌아간다", async () => {
    // 미션 응답은 비어 있는데 선택 id는 남아 있는 상태 — 재조회로 미션이 빠진 뒤와 같다
    stubDetail("ready");
    authenticate();
    useThemeFilterStore.setState({ activeTheme: "festival" });
    useMissionSelectionStore.setState({ selectedMissionId: 7 });

    renderHome();

    // 지역축제 목록의 빈 상태가 떠야 한다 — 지역 격자 패널(행정동 헤더)로 떨어지면 안 된다
    expect(
      await screen.findByText(/지금 진행 중인 지역축제가 없어요/),
    ).toBeTruthy();
    expect(screen.queryByText("부전제1동")).toBeNull();
  });
});
