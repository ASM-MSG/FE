import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DexData } from "@/entities/dex";
import { useGalleryRegionStore } from "@/features/dex/model/gallery-region-store";
import { useMapOverlayStore } from "@/features/dex/model/map-overlay-store";
import { useRecentRemovalStore } from "@/features/dex/model/recent-removal-store";
import { DexPanel } from "./DexPanel";

/**
 * 도감 패널 스모크 (AC 18·19·25 — mock queryFn이 빈/오류 상태를 만들지 않거나 이벤트 전파·a11y
 * 이름 판정이 필요해 브라우저 대신 vitest로 판정, 스펙 검증 방법 컬럼·업로드 위저드 스모크 선례).
 * QueryClient 캐시에 상태를 주입해 빈 데이터·오류 상태를 재현한다.
 * 오버레이 게시/해제(AC 9·11)·행 클릭→moveTo(AC 16)·X 제거(AC 24·25)의 배선도 스토어/스파이로
 * 확인한다 — 지도 픽셀 렌더는 브라우저 검증의 몫이고 여기서는 wiring만 단정한다.
 * jsdom에는 kakao 전역이 없어 현재 지역은 항상 디폴트 "중구" 경로다(A13 — region-lookup null 폴백).
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

/** 수집 0건(신규 사용자) 주입 데이터 — 2026-07-22 개정 DexData 계약 */
const EMPTY_DEX: DexData = {
  summary: {
    nickname: "새 사용자",
    totalExploredPct: 0,
    streakDays: 0,
    collectedCellCount: 0,
    badgeCount: 0,
  },
  collectedCells: [],
  regionExploredPctMap: { 중구: 22 },
};

/** 수집 2건 주입 데이터 — 오버레이 게시·행 클릭·X 제거 배선 확인용 */
const DEX_WITH_CELLS: DexData = {
  summary: { ...EMPTY_DEX.summary, collectedCellCount: 2 },
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
      cellId: "B-07",
      label: "망원 B-07",
      district: "마포구",
      center: { lat: 37.5556, lng: 126.9016 },
      collectedAt: "2026-07-20T09:00:00.000Z",
      videoCount: 1,
    },
  ],
  regionExploredPctMap: { 중구: 22 },
};

describe("도감 패널 스모크", () => {
  beforeEach(() => {
    useMapOverlayStore.setState(useMapOverlayStore.getInitialState(), true);
    useRecentRemovalStore.setState(
      useRecentRemovalStore.getInitialState(),
      true,
    );
    // 행 클릭이 갤러리 지역을 쓰게 되어(MSG-122 AC 19) 케이스 간 격리를 위해 함께 초기화
    useGalleryRegionStore.setState(
      useGalleryRegionStore.getInitialState(),
      true,
    );
    moveToSpy.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("수집 0건이면 통계 카드는 0으로, 목록은 빈 상태 안내로, 오버레이는 미게시로 렌더된다 (AC 18)", () => {
    const client = createClient();
    client.setQueryData(["dex"], EMPTY_DEX);
    renderPanel(client);

    // 통계 카드: 수집 격자 0개 · 획득 뱃지 0개 · 연속 스트릭 0일
    expect(screen.getAllByText("0개").length).toBe(2);
    expect(screen.getByText("0일")).toBeTruthy();
    expect(screen.getByText(/아직 수집한 격자가 없어요/)).toBeTruthy();
    // 지도 오버레이 없음 — 게시 스토어가 빈 상태를 유지한다
    expect(useMapOverlayStore.getState().cells).toEqual([]);
  });

  it("도감 쿼리 실패 시 오류 안내·재시도 버튼이 렌더되고, 재시도 클릭 시 다시 조회한다 (AC 19)", async () => {
    const client = createClient();
    // 오류 상태 주입 — 실패하는 queryFn으로 캐시 엔트리를 error로 만든다
    await client
      .fetchQuery({
        queryKey: ["dex"],
        queryFn: () => Promise.reject(new Error("network down")),
        retry: false,
      })
      .catch(() => undefined);
    renderPanel(client);

    expect(screen.getByText("도감을 불러오지 못했어요")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    // refetch는 실제 queryFn(mock 성공)을 태우므로 데이터 화면으로 복구된다
    await waitFor(() => expect(screen.getByText("필맵퍼")).toBeTruthy());
  });

  it("지도 탭 마운트 시 수집 오버레이를 게시하고, 언마운트(섹션 이탈) 시 해제한다 (AC 9·11 배선)", () => {
    const client = createClient();
    client.setQueryData(["dex"], DEX_WITH_CELLS);
    const { unmount } = renderPanel(client);

    expect(useMapOverlayStore.getState().cells.map((c) => c.id)).toEqual([
      "A-14",
      "B-07",
    ]);

    unmount();
    expect(useMapOverlayStore.getState().cells).toEqual([]);
  });

  it("격자 행 클릭 시 해당 격자 중심 좌표로 지도 이동 명령을 보낸다 (AC 16 배선 — MSG-122 AC 19 개정으로 갤러리 전환이 동반된다)", async () => {
    const client = createClient();
    client.setQueryData(["dex"], DEX_WITH_CELLS);
    renderPanel(client);

    // X 제거 버튼("… 목록에서 제거")과 구분 — 이동용 행 버튼은 메타("영상 N개")를 이름에 포함한다
    fireEvent.click(
      screen.getByRole("button", { name: /홍대입구 A-14.*영상 2개/ }),
    );

    expect(moveToSpy).toHaveBeenCalledWith({ lat: 37.5573, lng: 126.9245 });
    // AC 19 동반 전환의 갤러리 쿼리 해소를 기다린다(act 경고 방지) — 전환 자체의 단정은 gallery-tab.smoke 몫
    expect(await screen.findByText(/^마포구 · 영상 \d+개$/)).toBeTruthy();
  });

  it("X 버튼은 행별 접근 가능한 이름을 갖고, 클릭 시 해당 행만 사라지며 지도 이동으로 전파되지 않는다 (AC 24·25, 개정 D4)", () => {
    const client = createClient();
    client.setQueryData(["dex"], DEX_WITH_CELLS);
    renderPanel(client);

    // 행별 접근 가능한 이름 (AC 25)
    const removeButton = screen.getByRole("button", {
      name: "홍대입구 A-14 목록에서 제거",
    });
    fireEvent.click(removeButton);

    // 해당 행만 제거, 다른 행 유지 (AC 24)
    expect(screen.queryByText("홍대입구 A-14")).toBeNull();
    expect(screen.getByText("망원 B-07")).toBeTruthy();
    // 행 클릭(지도 이동)으로 전파 금지 (AC 25)
    expect(moveToSpy).not.toHaveBeenCalled();
    // 통계 카드·지도 오버레이 불변 — 수집 취소가 아니다 (AC 24)
    expect(screen.getByText("2개")).toBeTruthy(); // 수집 격자 카드
    expect(useMapOverlayStore.getState().cells.map((c) => c.id)).toEqual([
      "A-14",
      "B-07",
    ]);
  });

  it("X로 전부 제거해도 '수집 0건' 빈 상태 안내는 나타나지 않는다 (AC 18과 구분)", () => {
    const client = createClient();
    client.setQueryData(["dex"], DEX_WITH_CELLS);
    renderPanel(client);

    fireEvent.click(
      screen.getByRole("button", { name: "홍대입구 A-14 목록에서 제거" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "망원 B-07 목록에서 제거" }),
    );

    expect(screen.queryByText(/아직 수집한 격자가 없어요/)).toBeNull();
    expect(screen.getByText("최근 수집한 격자")).toBeTruthy();
  });
});
