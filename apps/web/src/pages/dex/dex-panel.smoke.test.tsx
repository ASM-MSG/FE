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
import { useMapOverlayStore } from "@/features/dex/model/map-overlay-store";
import { DexPanel } from "./DexPanel";

/**
 * 도감 패널 스모크 (AC 18·19 — mock queryFn이 빈/오류 상태를 만들지 않아 브라우저 대신
 * vitest로 판정, 스펙 검증 방법 컬럼·업로드 위저드 스모크 선례).
 * QueryClient 캐시에 상태를 주입해 빈 데이터·오류 상태를 재현한다.
 * 오버레이 게시/해제(AC 9·11)와 행 클릭→moveTo(AC 16)의 배선도 스토어/스파이로 확인한다 —
 * 지도 픽셀 렌더는 브라우저 검증의 몫이고 여기서는 wiring만 단정한다.
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

/** 수집 0건(신규 사용자) 주입 데이터 */
const EMPTY_DEX: DexData = {
  summary: {
    nickname: "새 사용자",
    totalLabel: "서울",
    totalExploredPct: 0,
    streakDays: 0,
    collectedCellCount: 0,
    badgeCount: 0,
    regionName: "마포구",
    regionExploredPct: 0,
  },
  collectedCells: [],
};

/** 수집 2건 주입 데이터 — 오버레이 게시·행 클릭 배선 확인용 */
const DEX_WITH_CELLS: DexData = {
  summary: { ...EMPTY_DEX.summary, collectedCellCount: 2 },
  collectedCells: [
    {
      cellId: "A-14",
      label: "홍대입구 A-14",
      center: { lat: 37.5573, lng: 126.9245 },
      collectedAt: "2026-07-21T09:00:00.000Z",
      videoCount: 2,
    },
    {
      cellId: "B-07",
      label: "망원 B-07",
      center: { lat: 37.5556, lng: 126.9016 },
      collectedAt: "2026-07-20T09:00:00.000Z",
      videoCount: 1,
    },
  ],
};

describe("도감 패널 스모크", () => {
  beforeEach(() => {
    useMapOverlayStore.setState(useMapOverlayStore.getInitialState(), true);
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

  it("격자 행 클릭 시 해당 격자 중심 좌표로 지도 이동 명령을 보낸다 (AC 16 배선)", () => {
    const client = createClient();
    client.setQueryData(["dex"], DEX_WITH_CELLS);
    renderPanel(client);

    fireEvent.click(screen.getByRole("button", { name: /홍대입구 A-14/ }));

    expect(moveToSpy).toHaveBeenCalledWith({ lat: 37.5573, lng: 126.9245 });
  });
});
