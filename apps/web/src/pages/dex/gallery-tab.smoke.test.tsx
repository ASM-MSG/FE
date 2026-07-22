import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectedVideo, DexData } from "@/entities/dex";
import { useGalleryRegionStore } from "@/features/dex/model/gallery-region-store";
import { useMapOverlayStore } from "@/features/dex/model/map-overlay-store";
import { DexPanel } from "./DexPanel";

/**
 * 갤러리 탭 스모크 (MSG-122 AC 7~11 + AC 14·18 배선 — mock queryFn이 실패·pending·빈 지역을
 * 브라우저에서 확정적으로 재현하지 못하거나(위치 의존) 대체 텍스트 판정이 필요해 vitest로 판정,
 * 스펙 검증 방법 컬럼·dex-panel.smoke 선례). QueryClient 캐시에 상태를 주입해 재현한다.
 * jsdom에는 kakao 전역이 없어 역지오코딩은 항상 null → 직접 진입 지역은 디폴트 "중구"다(AC 3).
 * "중구"는 mock 수집이 없어(Q1 확정 — 추가하지 않음) 직접 진입 빈 상태가 정상 시연이다.
 * 지도 픽셀·Polygon 클릭은 브라우저 검증의 몫 — 여기서는 스토어/핸들러 wiring만 단정한다.
 */

const moveToSpy = vi.fn();

/** MapShell 대역 — Outlet context로 지도 명령 API만 주입한다 */
const ShellStub = () => (
  <Outlet
    context={{
      moveTo: moveToSpy,
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      locate: vi.fn(),
    }}
  />
);

// 캐시 주입 상태가 마운트 직후 refetch로 덮이지 않도록 자동 재조회를 끈다
const createClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryOnMount: false,
        refetchOnMount: false,
        staleTime: Infinity,
      },
    },
  });

const renderPanel = (client: QueryClient, path = "/dex/gallery") =>
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<ShellStub />}>
            <Route path="/dex/:tab?" element={<DexPanel />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

/** 수집 2건(마포구·성동구) 주입 도감 데이터 — 셀 클릭 → 지역 매핑 배선 확인용 */
const DEX: DexData = {
  summary: {
    nickname: "필맵퍼",
    totalExploredPct: 0.012,
    streakDays: 3,
    collectedCellCount: 2,
    badgeCount: 1,
  },
  collectedCells: [
    {
      cellId: "A-14",
      label: "홍대입구 A-14",
      district: "마포구",
      center: { lat: 37.5573, lng: 126.9245 },
      collectedAt: "2026-07-21T09:00:00.000Z",
      videoCount: 2,
    },
    {
      cellId: "C-02",
      label: "성수 C-02",
      district: "성동구",
      center: { lat: 37.5446, lng: 127.0559 },
      collectedAt: "2026-07-19T09:00:00.000Z",
      videoCount: 1,
    },
  ],
  regionExploredPctMap: { 중구: 22 },
};

/** 갤러리 주입 데이터 — 썸네일 제공 2건 + 미제공(placeholder) 1건 (AC 10) */
const GALLERY_VIDEOS: CollectedVideo[] = [
  {
    id: "A-14-g1",
    cellId: "A-14",
    cellLabel: "홍대입구 A-14",
    thumbnailSrc:
      "data:image/svg+xml;utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E",
    collectedAt: "2026-07-21T10:00:00.000Z",
  },
  {
    id: "A-14-g2",
    cellId: "A-14",
    cellLabel: "홍대입구 A-14",
    thumbnailSrc:
      "data:image/svg+xml;utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E",
    collectedAt: "2026-07-21T09:00:00.000Z",
  },
  {
    id: "B-07-g1",
    cellId: "B-07",
    cellLabel: "망원 B-07",
    collectedAt: "2026-07-20T09:00:00.000Z",
  },
];

describe("갤러리 탭 스모크", () => {
  beforeEach(() => {
    useMapOverlayStore.setState(useMapOverlayStore.getInitialState(), true);
    useGalleryRegionStore.setState(
      useGalleryRegionStore.getInitialState(),
      true,
    );
    moveToSpy.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("갤러리 쿼리 pending 중 스켈레톤(그리드 자리 타일)이 렌더된다 (AC 9)", async () => {
    const client = createClient();
    client.setQueryData(["dex"], DEX);
    renderPanel(client);

    // queryFn(비동기)이 해소되기 전 첫 렌더는 pending — 스켈레톤이 보인다
    expect(
      screen.getByRole("status", { name: "갤러리 불러오는 중" }),
    ).toBeTruthy();

    // 해소 후 상태(중구 빈 갤러리)로 전환될 때까지 대기 — act 경고 방지
    await screen.findByText(/중구에서 수집한 영상이 아직 없어요/);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("수집 영상이 없는 지역이면 빈 상태 안내가 렌더되고 전체 보기 버튼은 없다 (AC 8, Q1·A4)", async () => {
    const client = createClient();
    client.setQueryData(["dex"], DEX);
    renderPanel(client);

    expect(
      await screen.findByText(/중구에서 수집한 영상이 아직 없어요/),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "갤러리 전체 보기" }),
    ).toBeNull();
  });

  it("갤러리 조회 실패 시 오류 안내·재시도 버튼이 렌더되고, 재시도 클릭 시 다시 조회한다 (AC 7)", async () => {
    const client = createClient();
    client.setQueryData(["dex"], DEX);
    // 오류 상태 주입 — 실패하는 queryFn으로 갤러리 캐시 엔트리를 error로 만든다
    await client
      .fetchQuery({
        queryKey: ["dex", "gallery", "중구"],
        queryFn: () => Promise.reject(new Error("network down")),
        retry: false,
      })
      .catch(() => undefined);
    renderPanel(client);

    expect(screen.getByText("갤러리를 불러오지 못했어요")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    // refetch는 실제 queryFn(mock — 중구 빈 배열)을 태우므로 빈 상태 화면으로 복구된다
    expect(
      await screen.findByText(/중구에서 수집한 영상이 아직 없어요/),
    ).toBeTruthy();
  });

  it("각 썸네일 타일이 격자 라벨을 포함한 대체 텍스트를 갖고, thumbnailSrc 없는 항목은 placeholder 타일로 렌더된다 (AC 10)", () => {
    const client = createClient();
    client.setQueryData(["dex"], DEX);
    client.setQueryData(["dex", "gallery", "중구"], GALLERY_VIDEOS);
    renderPanel(client);

    // 모든 타일이 img 역할 + 격자 라벨 포함 이름을 제공한다
    const tiles = screen.getAllByRole("img");
    expect(tiles.length).toBe(GALLERY_VIDEOS.length);

    const withThumb = screen.getAllByRole("img", {
      name: "홍대입구 A-14 수집 영상",
    });
    expect(withThumb.length).toBe(2);
    for (const tile of withThumb) expect(tile.tagName).toBe("IMG");

    // 미제공 항목 — img 태그가 아닌 placeholder 타일이되 대체 텍스트는 유지한다
    const placeholder = screen.getByRole("img", {
      name: "망원 B-07 수집 영상",
    });
    expect(placeholder.tagName).not.toBe("IMG");

    // 지역명 보조 표시 (A8) — 지역 · 영상 개수
    expect(screen.getByText("중구 · 영상 3개")).toBeTruthy();
  });

  it("갤러리 탭을 '탭 클릭'으로 진입하면 이전 셀 클릭 선택이 초기화되어 현재 지역 기준으로 표시된다 (AC 11, A1)", async () => {
    const client = createClient();
    client.setQueryData(["dex"], DEX);
    // 이전 셀 클릭 선택이 남아 있는 상황을 재현
    useGalleryRegionStore.getState().select("성동구");
    renderPanel(client, "/dex"); // 지도 탭에서 시작

    fireEvent.click(screen.getByRole("tab", { name: "갤러리" }));

    expect(useGalleryRegionStore.getState().selectedRegion).toBeNull();
    // jsdom 역지오코딩 null → 현재 지역 디폴트 "중구" 기준으로 표시된다
    expect(
      await screen.findByText(/중구에서 수집한 영상이 아직 없어요/),
    ).toBeTruthy();
  });

  it("오버레이 셀 클릭 시 그 격자 지역이 선택되고 갤러리 탭으로 전환된다 — 미수집 id는 no-op (AC 14 배선, AC 4)", async () => {
    const client = createClient();
    client.setQueryData(["dex"], DEX);
    renderPanel(client, "/dex"); // 지도 탭에서 시작

    // 수집 목록에 없는 id — 선택·전환 모두 no-op (AC 4 방어)
    act(() => {
      useMapOverlayStore.getState().onCellClick?.("Z-99");
    });
    expect(useGalleryRegionStore.getState().selectedRegion).toBeNull();
    expect(screen.getByText("최근 수집한 격자")).toBeTruthy();

    // 수집 격자(성수 C-02) 클릭 → 성동구 갤러리로 전환 (AC 14)
    act(() => {
      useMapOverlayStore.getState().onCellClick?.("C-02");
    });
    expect(useGalleryRegionStore.getState().selectedRegion).toBe("성동구");
    expect(screen.getByText("지역별 갤러리")).toBeTruthy();
    expect(await screen.findByText(/^성동구 · 영상 \d+개$/)).toBeTruthy();
  });

  it("갤러리 탭에서도 수집 오버레이가 게시 유지되고 셀 클릭 핸들러가 등록된다 (AC 18 배선, A3 — MSG-121 '지도 탭에서만 게시'의 의도된 변경)", () => {
    const client = createClient();
    client.setQueryData(["dex"], DEX);
    renderPanel(client, "/dex/gallery");

    expect(useMapOverlayStore.getState().cells.map((c) => c.id)).toEqual([
      "A-14",
      "C-02",
    ]);
    expect(useMapOverlayStore.getState().onCellClick).not.toBeNull();
  });
});
