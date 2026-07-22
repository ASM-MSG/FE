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
import type { Cell, CellVideo } from "@/entities/cell";
import type { CollectedVideo, DexData } from "@/entities/dex";
import { useGalleryRegionStore } from "@/features/dex/model/gallery-region-store";
import { useMapOverlayStore } from "@/features/dex/model/map-overlay-store";
import { useCellDetailStore } from "@/features/explore/model/cell-detail-store";
import { DexPanel } from "./DexPanel";

/**
 * 갤러리 뷰 스모크 (MSG-122 ② 개정 — AC 7~10 상태 판정 + AC 14·18·19 배선 + 신규
 * AC 20·22·23·24·27). 갤러리는 탭이 아니라 지도 탭 내부 뷰다(B1) — gallery-region-store의
 * selectedRegion이 뷰 상태를 겸하므로, 상태 재현이 필요한 케이스는 스토어에 직접 select한다
 * (UI 진입 경로는 셀·행 클릭뿐 — 그 배선은 AC 14·19 케이스가 별도 판정).
 * mock queryFn이 실패·pending·빈 지역을 브라우저에서 확정적으로 재현하지 못해 vitest로 판정
 * (스펙 검증 방법 컬럼·dex-panel.smoke 선례). QueryClient 캐시에 상태를 주입해 재현한다.
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

// 갤러리는 URL 진입이 없다(② B1) — 항상 지도 탭(/dex)에서 렌더하고 뷰 상태로 분기한다
const renderPanel = (client: QueryClient, path = "/dex") =>
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

/** 수집 2건(부산진구·수영구) 주입 도감 데이터 — 셀 클릭 → 지역 매핑 배선 확인용 */
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
      label: "서면 A-14",
      district: "부산진구",
      center: { lat: 35.1573, lng: 129.0586 },
      collectedAt: "2026-07-21T09:00:00.000Z",
      videoCount: 2,
    },
    {
      cellId: "C-02",
      label: "광안리 C-02",
      district: "수영구",
      center: { lat: 35.1532, lng: 129.1187 },
      collectedAt: "2026-07-19T09:00:00.000Z",
      videoCount: 1,
    },
  ],
  regionExploredPctMap: { 부산진구: 22 },
};

const cellVideo = (id: string, title: string): CellVideo => ({
  id,
  title,
  viewCount: 100,
  uploadedAt: "2026-07-20T00:00:00.000Z",
  durationSec: 42,
});

/** 탐색과 동일 소스(["cells"]) 주입 격자 — 썸네일 클릭 → 상세 시트 매칭 대상 (AC 23, Q7) */
const CELLS: Cell[] = [
  {
    id: "C-02",
    label: "광안리 C-02",
    district: "수영구",
    center: { lat: 35.1532, lng: 129.1187 },
    videoCount: 3,
    createdAt: "2026-07-01T09:00:00.000Z",
    location: "부산 수영구 광안리",
    recentUploadedAt: "2026-07-21T09:00:00.000Z",
    fillRate: 88,
    viewCount: 24000,
    videos: [
      cellVideo("C-02-v1", "광안리 골목 브이로그"),
      cellVideo("C-02-v2", "광안리 카페 투어"),
      cellVideo("C-02-v3", "광안리 야경 산책"),
    ],
  },
  {
    id: "A-14",
    label: "서면 A-14",
    district: "부산진구",
    center: { lat: 35.1573, lng: 129.0586 },
    videoCount: 1,
    createdAt: "2026-07-02T09:00:00.000Z",
    location: "부산 부산진구 서면",
    recentUploadedAt: "2026-07-21T09:00:00.000Z",
    fillRate: 73,
    viewCount: 1400,
    videos: [cellVideo("A-14-v1", "서면 거리 공연")],
  },
];

/** 도감·격자 소스 공통 주입 — DexPanel은 시트용 격자 소스(useCellsQuery)를 항상 구독한다(②) */
const seedClient = (client: QueryClient) => {
  client.setQueryData(["dex"], DEX);
  client.setQueryData(["cells"], CELLS);
};

/** 갤러리 주입 데이터 — 썸네일 제공 2건 + 미제공(placeholder) 1건 (AC 10, id는 -v 체계 B3) */
const GALLERY_VIDEOS: CollectedVideo[] = [
  {
    id: "A-14-v1",
    cellId: "A-14",
    cellLabel: "서면 A-14",
    thumbnailSrc:
      "data:image/svg+xml;utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E",
    collectedAt: "2026-07-21T10:00:00.000Z",
  },
  {
    id: "A-14-v2",
    cellId: "A-14",
    cellLabel: "서면 A-14",
    thumbnailSrc:
      "data:image/svg+xml;utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E",
    collectedAt: "2026-07-21T09:00:00.000Z",
  },
  {
    id: "B-07-v1",
    cellId: "B-07",
    cellLabel: "부전 B-07",
    collectedAt: "2026-07-20T09:00:00.000Z",
  },
];

/**
 * 수영구 갤러리 주입 데이터 — Cell.videos와 id 체계 일치(② B3, 활성 매칭) +
 * 격자 소스에 없는 cellId 1건(Z-99 — AC 23 no-op 방어 판정용)
 */
const SUYEONG_VIDEOS: CollectedVideo[] = [
  {
    id: "C-02-v1",
    cellId: "C-02",
    cellLabel: "광안리 C-02",
    collectedAt: "2026-07-21T10:00:00.000Z",
  },
  {
    id: "C-02-v2",
    cellId: "C-02",
    cellLabel: "광안리 C-02",
    collectedAt: "2026-07-21T09:00:00.000Z",
  },
  {
    id: "Z-99-v1",
    cellId: "Z-99",
    cellLabel: "유령 Z-99",
    collectedAt: "2026-07-20T09:00:00.000Z",
  },
];

describe("갤러리 뷰 스모크", () => {
  beforeEach(() => {
    useMapOverlayStore.setState(useMapOverlayStore.getInitialState(), true);
    useGalleryRegionStore.setState(
      useGalleryRegionStore.getInitialState(),
      true,
    );
    useCellDetailStore.setState({ selectedCellId: null, activeVideoId: null });
    moveToSpy.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("도감 탭은 지도·뱃지 2개만 렌더된다 — 갤러리 탭 버튼이 존재하지 않는다 (AC 20)", () => {
    const client = createClient();
    seedClient(client);
    renderPanel(client);

    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "지도",
      "뱃지",
    ]);
    expect(screen.queryByRole("tab", { name: "갤러리" })).toBeNull();
  });

  it("갤러리 쿼리 pending 중 스켈레톤(그리드 자리 타일)이 렌더된다 (AC 9)", async () => {
    const client = createClient();
    seedClient(client);
    // 갤러리 뷰 상태 재현 — 수집 없는 "사상구"라 해소 후엔 빈 상태다 (Q5)
    useGalleryRegionStore.getState().select("사상구");
    renderPanel(client);

    // queryFn(비동기)이 해소되기 전 첫 렌더는 pending — 스켈레톤이 보인다
    expect(
      screen.getByRole("status", { name: "갤러리 불러오는 중" }),
    ).toBeTruthy();

    // 해소 후 상태(사상구 빈 갤러리)로 전환될 때까지 대기 — act 경고 방지
    await screen.findByText(/사상구에서 수집한 영상이 아직 없어요/);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("수집 영상이 없는 지역이면 빈 상태 안내가 렌더되고 전체 보기 버튼은 없다 (AC 8 ② — UI 도달 불가한 방어 분기라 스모크 전용 판정, Q5·A4)", async () => {
    const client = createClient();
    seedClient(client);
    useGalleryRegionStore.getState().select("사상구");
    renderPanel(client);

    expect(
      await screen.findByText(/사상구에서 수집한 영상이 아직 없어요/),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "갤러리 전체 보기" }),
    ).toBeNull();
  });

  it("갤러리 조회 실패 시 오류 안내·재시도 버튼이 렌더되고, 재시도 클릭 시 다시 조회한다 (AC 7)", async () => {
    const client = createClient();
    seedClient(client);
    useGalleryRegionStore.getState().select("사상구");
    // 오류 상태 주입 — 실패하는 queryFn으로 갤러리 캐시 엔트리를 error로 만든다
    await client
      .fetchQuery({
        queryKey: ["dex", "gallery", "사상구"],
        queryFn: () => Promise.reject(new Error("network down")),
        retry: false,
      })
      .catch(() => undefined);
    renderPanel(client);

    expect(screen.getByText("갤러리를 불러오지 못했어요")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    // refetch는 실제 queryFn(mock — 사상구 빈 배열)을 태우므로 빈 상태 화면으로 복구된다
    expect(
      await screen.findByText(/사상구에서 수집한 영상이 아직 없어요/),
    ).toBeTruthy();
  });

  it("각 썸네일 타일이 격자 라벨 이름을 가진 button이고, thumbnailSrc 없는 항목은 placeholder 타일로 렌더된다 (AC 10 ② button화)", () => {
    const client = createClient();
    seedClient(client);
    useGalleryRegionStore.getState().select("사상구");
    client.setQueryData(["dex", "gallery", "사상구"], GALLERY_VIDEOS);
    renderPanel(client);

    // 이미지·placeholder 두 경로 모두 접근 가능한 이름을 가진 버튼이다 (AC 10 ②)
    const tiles = screen.getAllByRole("button", { name: /수집 영상$/ });
    expect(tiles.length).toBe(GALLERY_VIDEOS.length);
    for (const tile of tiles) expect(tile.tagName).toBe("BUTTON");

    const withThumb = screen.getAllByRole("button", {
      name: "서면 A-14 수집 영상",
    });
    expect(withThumb.length).toBe(2);
    for (const tile of withThumb) expect(tile.querySelector("img")).toBeTruthy();

    // 미제공 항목 — img 없이 placeholder 타일이되 접근 가능한 이름은 유지한다
    const placeholder = screen.getByRole("button", {
      name: "부전 B-07 수집 영상",
    });
    expect(placeholder.querySelector("img")).toBeNull();

    // 지역명 보조 표시 (A8) — 지역 · 영상 개수
    expect(screen.getByText("사상구 · 영상 3개")).toBeTruthy();
  });

  it("갤러리 뷰에서 지도 탭을 누르면 지도 탭 본문(최근 수집 목록)으로 복귀하고 뷰 상태가 해제된다 (AC 22)", () => {
    const client = createClient();
    seedClient(client);
    useGalleryRegionStore.getState().select("수영구");
    client.setQueryData(["dex", "gallery", "수영구"], SUYEONG_VIDEOS);
    renderPanel(client);

    expect(screen.getByText("지역별 갤러리")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "지도" }));

    expect(useGalleryRegionStore.getState().selectedRegion).toBeNull();
    expect(screen.getByText("최근 수집한 격자")).toBeTruthy();
    expect(screen.queryByText("지역별 갤러리")).toBeNull();
  });

  it("오버레이 셀 클릭 시 그 격자 지역의 갤러리 뷰로 전환된다 — 지도 탭 유지(B2), 미수집 id는 no-op (AC 14 ② 배선, AC 4)", async () => {
    const client = createClient();
    seedClient(client);
    client.setQueryData(["dex", "gallery", "수영구"], SUYEONG_VIDEOS);
    renderPanel(client);

    // 수집 목록에 없는 id — 선택·전환 모두 no-op (AC 4 방어)
    act(() => {
      useMapOverlayStore.getState().onCellClick?.("Z-99");
    });
    expect(useGalleryRegionStore.getState().selectedRegion).toBeNull();
    expect(screen.getByText("최근 수집한 격자")).toBeTruthy();

    // 수집 격자(광안리 C-02) 클릭 → 수영구 갤러리 뷰 (AC 14 ② — 탭 전환 아님)
    act(() => {
      useMapOverlayStore.getState().onCellClick?.("C-02");
    });
    expect(useGalleryRegionStore.getState().selectedRegion).toBe("수영구");
    expect(screen.getByText("지역별 갤러리")).toBeTruthy();
    expect(await screen.findByText(/^수영구 · 영상 \d+개$/)).toBeTruthy();
    // 갤러리는 지도 탭 내부 뷰 — 활성 탭은 지도 유지 (B2)
    expect(
      screen.getByRole("tab", { name: "지도" }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("최근 수집 격자 행 클릭 시 지도가 그 격자로 이동하고(MSG-121 유지) 그 지역의 갤러리 뷰로 전환된다 (AC 19 ② 배선 — URL 무변경)", async () => {
    const client = createClient();
    seedClient(client);
    client.setQueryData(["dex", "gallery", "수영구"], SUYEONG_VIDEOS);
    renderPanel(client);

    fireEvent.click(screen.getByRole("button", { name: /광안리 C-02.*영상 1개/ }));

    // 기존 지도 이동(MSG-121 AC 16) 유지 — 제거 금지
    expect(moveToSpy).toHaveBeenCalledWith({ lat: 35.1532, lng: 129.1187 });
    // 행의 district로 지역 선택 → 갤러리 뷰 (탭 전환 없음 — ② 개정)
    expect(useGalleryRegionStore.getState().selectedRegion).toBe("수영구");
    expect(screen.getByText("지역별 갤러리")).toBeTruthy();
    expect(await screen.findByText(/^수영구 · 영상 \d+개$/)).toBeTruthy();
  });

  it("갤러리 뷰에서도 수집 오버레이가 게시 유지되고 셀 클릭 핸들러가 등록된다 (AC 18 배선 — ② 게시 조건 map 단일화로 자동 충족)", () => {
    const client = createClient();
    seedClient(client);
    useGalleryRegionStore.getState().select("수영구");
    client.setQueryData(["dex", "gallery", "수영구"], SUYEONG_VIDEOS);
    renderPanel(client);

    expect(useMapOverlayStore.getState().cells.map((c) => c.id)).toEqual([
      "A-14",
      "C-02",
    ]);
    expect(useMapOverlayStore.getState().onCellClick).not.toBeNull();
  });

  it("썸네일 클릭 시 격자 상세 시트가 우측 컬럼에 열리고 클릭한 영상이 활성 상태다 — 격자 소스에 없는 cellId는 no-op (AC 23)", () => {
    const client = createClient();
    seedClient(client);
    useGalleryRegionStore.getState().select("수영구");
    client.setQueryData(["dex", "gallery", "수영구"], SUYEONG_VIDEOS);
    renderPanel(client);

    // 격자 소스(["cells"])에 없는 cellId — 시트를 열지 않는다 (방어)
    fireEvent.click(screen.getByRole("button", { name: "유령 Z-99 수집 영상" }));
    expect(useCellDetailStore.getState().selectedCellId).toBeNull();

    // 두 번째 타일(C-02-v2) 클릭 — 대표 영상(videos[0])이 아닌 "클릭한 영상"이 활성이어야 한다
    fireEvent.click(
      screen.getAllByRole("button", { name: "광안리 C-02 수집 영상" })[1],
    );

    expect(useCellDetailStore.getState().selectedCellId).toBe("C-02");
    expect(useCellDetailStore.getState().activeVideoId).toBe("C-02-v2");
    // 시트가 렌더된다 — 격자명 헤딩 + "이 격자의 영상" 리스트 (탐색 CellDetailSheet 동형, Q7)
    expect(screen.getByRole("heading", { name: "광안리 C-02" })).toBeTruthy();
    expect(screen.getByText("이 격자의 영상")).toBeTruthy();
    // 클릭한 영상 행이 활성(aria-current) 표시 (AC 23)
    const activeRow = screen.getByRole("button", { current: true });
    expect(activeRow.textContent).toContain("광안리 카페 투어");
  });

  it("시트의 닫기 버튼·Escape로 시트만 닫히고 갤러리 뷰는 유지된다 (AC 24)", () => {
    const client = createClient();
    seedClient(client);
    useGalleryRegionStore.getState().select("수영구");
    client.setQueryData(["dex", "gallery", "수영구"], SUYEONG_VIDEOS);
    renderPanel(client);

    const openSheet = () =>
      fireEvent.click(
        screen.getAllByRole("button", { name: "광안리 C-02 수집 영상" })[0],
      );

    // 닫기 버튼
    openSheet();
    fireEvent.click(screen.getByRole("button", { name: "상세 닫기" }));
    expect(useCellDetailStore.getState().selectedCellId).toBeNull();
    expect(screen.getByText("지역별 갤러리")).toBeTruthy();
    expect(useGalleryRegionStore.getState().selectedRegion).toBe("수영구");

    // Escape
    openSheet();
    expect(useCellDetailStore.getState().selectedCellId).toBe("C-02");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(useCellDetailStore.getState().selectedCellId).toBeNull();
    expect(screen.getByText("지역별 갤러리")).toBeTruthy();
  });

  it("갤러리 뷰 진입·지역 전환 시 이전 시트가 닫힌 상태다 — 탐색 잔존 시트 포함 (AC 27, B4·R10)", async () => {
    const client = createClient();
    seedClient(client);
    client.setQueryData(["dex", "gallery", "수영구"], SUYEONG_VIDEOS);
    client.setQueryData(["dex", "gallery", "부산진구"], []);
    // 탐색 탭에서 열어둔 시트가 남은 상황을 재현 (store 공유, Q7)
    useCellDetailStore.getState().select(CELLS[0]);
    renderPanel(client);

    // 갤러리 뷰 진입(오버레이 셀 클릭) — 잔존 시트가 닫힌다
    act(() => {
      useMapOverlayStore.getState().onCellClick?.("C-02");
    });
    expect(useCellDetailStore.getState().selectedCellId).toBeNull();

    // 시트를 열고 다른 지역으로 전환 — 이전 지역 시트가 닫힌다
    fireEvent.click(
      screen.getAllByRole("button", { name: "광안리 C-02 수집 영상" })[0],
    );
    expect(useCellDetailStore.getState().selectedCellId).toBe("C-02");
    act(() => {
      useMapOverlayStore.getState().onCellClick?.("A-14");
    });
    expect(useGalleryRegionStore.getState().selectedRegion).toBe("부산진구");
    expect(useCellDetailStore.getState().selectedCellId).toBeNull();
    await screen.findByText(/부산진구에서 수집한 영상이 아직 없어요/);
  });

  it("패널 언마운트 시 갤러리 뷰·시트 상태가 해제된다 — 도감의 시트가 탐색으로 새지 않는다 (AC 27, B4)", () => {
    const client = createClient();
    seedClient(client);
    useGalleryRegionStore.getState().select("수영구");
    client.setQueryData(["dex", "gallery", "수영구"], SUYEONG_VIDEOS);
    const { unmount } = renderPanel(client);

    fireEvent.click(
      screen.getAllByRole("button", { name: "광안리 C-02 수집 영상" })[0],
    );
    expect(useCellDetailStore.getState().selectedCellId).toBe("C-02");

    unmount();

    expect(useGalleryRegionStore.getState().selectedRegion).toBeNull();
    expect(useCellDetailStore.getState().selectedCellId).toBeNull();
  });
});
