import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DexData } from "@/entities/dex";
import { useGalleryRegionStore } from "@/features/dex/model/gallery-region-store";
import { useMapOverlayStore } from "@/widgets/map-shell/map-overlay-store";
import { DexPanel } from "./DexPanel";

/**
 * 뱃지 탭 스모크 (MSG-123 AC 1·6·7·11 — 검증자 승격, 03_verify_report 기록).
 * 뱃지 탭 진입·진열장 확장·탭 이탈 복귀·게이트 공유는 후속 뱃지 티켓(실 API·획득 판정·상세)이
 * 재검증할 안정 사용자 흐름이라 dex-panel·gallery-tab 스모크 선례대로 커밋 자산화한다.
 * mock queryFn이 pending·오류를 브라우저에서 확정적으로 재현하지 못해 vitest로 판정하고,
 * QueryClient 캐시 주입으로 상태를 재현한다. 문구·스타일 단정은 스펙 명시 라벨
 * ("준비 중이에요" 부재, "미획득", "전체 보기")로 한정한다.
 */

/** MapShell 대역 — Outlet context로 지도 명령 API만 주입한다 (dex-panel.smoke 선례) */
const ShellStub = () => (
  <Outlet
    context={{
      moveTo: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      locate: vi.fn(),
    }}
  />
);

// 캐시 주입 상태가 마운트 직후 refetch로 덮이지 않도록 자동 재조회를 끈다
const createClient = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryOnMount: false,
        refetchOnMount: false,
        staleTime: Infinity,
      },
    },
  });
  // 상세 시트용 격자 소스(useCellsQuery) 상시 구독 — 빈 배열 주입으로 act 경고 차단
  client.setQueryData(["cells"], []);
  return client;
};

const renderPanel = (client: QueryClient, path = "/dex/badges") =>
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

/**
 * 뱃지 10개(획득 2 — 프리뷰 8개 안 배치) 주입 도감 데이터 — MOCK_BADGES와 독립인
 * 자체 픽스처라 mock 개편에 흔들리지 않는다. badgeCount는 earned 수와 정합(AC 5 계약).
 */
const DEX_WITH_BADGES: DexData = {
  summary: {
    nickname: "필맵퍼",
    totalExploredPct: 0.012,
    streakDays: 3,
    totalGridCount: 0,
    badgeCount: 2,
  },
  collectedCells: [],
  badges: Array.from({ length: 10 }, (_, i) => ({
    badgeId: i,
    name: `뱃지 ${i}`,
    earned: i === 0 || i === 4,
  })),
  regionExploredPctMap: { 부산진구: 22 },
};

describe("뱃지 탭 스모크", () => {
  beforeEach(() => {
    useMapOverlayStore.setState(useMapOverlayStore.getInitialState(), true);
    useGalleryRegionStore.setState(
      useGalleryRegionStore.getInitialState(),
      true,
    );
  });

  afterEach(() => {
    cleanup();
  });

  it("/dex/badges 직접 진입 시 뱃지 진열장이 렌더되고 자리 문구는 없다 — 헤더·통계·탭 칩 유지 (AC 1·4)", () => {
    const client = createClient();
    client.setQueryData(["dex"], DEX_WITH_BADGES);
    renderPanel(client);

    expect(screen.queryByText(/준비 중이에요/)).toBeNull();
    expect(screen.getByRole("heading", { name: "뱃지 진열장" })).toBeTruthy();
    // 헤더·통계·탭 칩이 지도 탭과 동일 구성으로 유지된다
    expect(screen.getByText("필맵퍼")).toBeTruthy();
    expect(screen.getByText("2개")).toBeTruthy(); // 획득 뱃지 통계 카드
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "지도",
      "뱃지",
    ]);
    // 프리뷰 8개 — 획득 2개는 이름 라벨, 나머지 6개는 "미획득" 라벨 (AC 4)
    expect(screen.getAllByRole("listitem").length).toBe(8);
    expect(screen.getByText("뱃지 0")).toBeTruthy();
    expect(screen.getAllByText("미획득").length).toBe(6);
  });

  it("'전체 보기' 클릭 시 전체 카탈로그로 확장되고 링크·하단 버튼이 사라진다 (AC 6, A3)", () => {
    const client = createClient();
    client.setQueryData(["dex"], DEX_WITH_BADGES);
    renderPanel(client);

    expect(screen.getByRole("button", { name: "뱃지 전체 보기" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "전체 보기" }));

    expect(screen.getAllByRole("listitem").length).toBe(10);
    expect(screen.queryByRole("button", { name: "전체 보기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "뱃지 전체 보기" })).toBeNull();
  });

  it("확장 후 지도 탭에 다녀오면 프리뷰 상태로 복귀한다 (AC 7)", () => {
    const client = createClient();
    client.setQueryData(["dex"], DEX_WITH_BADGES);
    renderPanel(client);

    // 하단 버튼 경로로도 확장된다 — 링크 경로는 AC 6 케이스가 판정
    fireEvent.click(screen.getByRole("button", { name: "뱃지 전체 보기" }));
    expect(screen.getAllByRole("listitem").length).toBe(10);

    fireEvent.click(screen.getByRole("tab", { name: "지도" }));
    expect(screen.getByText(/아직 수집한 격자가 없어요/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "뱃지" }));
    expect(screen.getAllByRole("listitem").length).toBe(8);
    expect(screen.getByRole("button", { name: "전체 보기" })).toBeTruthy();
  });

  it("/dex/badges 진입도 도감 로딩 게이트를 공유한다 — 해소 후 진열장 렌더 (AC 11)", async () => {
    // ["dex"] 캐시 미주입 — 실제 queryFn(mock)의 pending 첫 렌더를 관찰한다
    const client = createClient();
    renderPanel(client);

    expect(screen.getByText(/도감을 불러오는 중이에요/)).toBeTruthy();

    expect(
      await screen.findByRole("heading", { name: "뱃지 진열장" }),
    ).toBeTruthy();
  });

  it("/dex/badges 진입도 오류·재시도 게이트를 공유한다 — 재시도 성공 시 진열장 렌더 (AC 11)", async () => {
    const client = createClient();
    // 오류 상태 주입 — 실패하는 queryFn으로 캐시 엔트리를 error로 만든다 (dex-panel.smoke 선례)
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

    // refetch는 실제 queryFn(mock 성공)을 태우므로 뱃지 탭 본문으로 복구된다
    expect(
      await screen.findByRole("heading", { name: "뱃지 진열장" }),
    ).toBeTruthy();
  });
});
