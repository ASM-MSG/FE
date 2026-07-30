import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/app/routes";
import { MOCK_CELLS } from "@/entities/cell";
import { MOCK_COLLECTED_VIDEOS, MOCK_DEX } from "@/entities/dex";
import { useExploreFilterStore } from "@/features/explore/model/explore-filter-store";
import { SearchBox } from "@/features/explore/ui/SearchBox";
import {
  canOpenDetail,
  deriveHomeCellDetail,
  myVideoIdsOf,
} from "@/features/map-home/model/home-cell-detail";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { buildGridLines } from "@/features/map-home/model/grid-overlay";
import { MOCK_ROUTE, themeCellsOf } from "@/features/map-home/model/theme";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import {
  buildHomeOverlayCells,
  buildRouteOverlay,
} from "@/features/map-home/model/theme-overlay";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { useMapOverlayStore } from "@/widgets/map-shell/map-overlay-store";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";
import { CellSummaryPanel } from "./ui/CellSummaryPanel";
import { HomeCellDetailPanel } from "./ui/HomeCellDetailPanel";
import { ThemeChipsBar } from "./ui/ThemeChipsBar";

// 내 점령 셀 = 도감 수집 격자 재사용 (A2) — 홈 기본 표시는 이번 티켓 신규 동작 (R3).
// center → 100m 격자 스냅(MSG-263 D3)은 파생(buildHomeOverlayCells → buildOccupiedGridCells) 몫
const OCCUPIED_CELLS = MOCK_DEX.collectedCells.map(({ cellId, center }) => ({
  cellId,
  center,
}));
const OCCUPIED_IDS = OCCUPIED_CELLS.map((c) => c.cellId);

/**
 * 홈 패널(`/`) — 지속 셸(MapShell)이 렌더한 지도 위에 얹는 388px 좌측 사이드바 + 상단 테마 칩.
 * 검색바 + 요약(CellSummaryPanel), 셀 선택 시 상세(HomeCellDetailPanel)로 전환된다 (MSG-252).
 * 테마 오버레이(점령·테마 셀·경로)는 map-overlay-store로 게시하고 렌더는 셸의 MapCanvas가
 * 담당한다 — 지도 SDK를 import하지 않는다(RN 경계). 접힘 시 칩·패널 모두 셸 래퍼로 숨는다(A6).
 */
export const MapHomePage = () => {
  const navigate = useNavigate();
  const { moveTo } = useMapShell();
  const clearFilters = useExploreFilterStore((s) => s.clearFilters);

  const activeTheme = useThemeFilterStore((s) => s.activeTheme);
  const resetThemeFilter = useThemeFilterStore((s) => s.reset);
  const selectedCellId = useHomeCellDetailStore((s) => s.selectedCellId);
  const selectCell = useHomeCellDetailStore((s) => s.select);
  const closeDetail = useHomeCellDetailStore((s) => s.close);

  const setCells = useMapOverlayStore((s) => s.setCells);
  const setRoute = useMapOverlayStore((s) => s.setRoute);
  const setGridLines = useMapOverlayStore((s) => s.setGridLines);
  const setOnCellClick = useMapOverlayStore((s) => s.setOnCellClick);
  const clearOverlays = useMapOverlayStore((s) => s.clear);

  // 격자선 파생 입력 — MapCanvas가 idle마다 push하는 뷰포트 (MSG-263 AC 2, R3)
  const viewportBounds = useViewportStore((s) => s.bounds);
  const zoom = useViewportStore((s) => s.zoom);

  const themeCells = useMemo(
    () => (activeTheme ? themeCellsOf(activeTheme) : []),
    [activeTheme],
  );

  // 강조 셀·경로 파생 (AC 2·6·7·8) — 뷰포트와 무관하게 게시한다: 활성 테마 셀이 화면 밖이면
  // 지도에 아무것도 더 그려지지 않아 기본 상태 그대로 보인다 (AC 11 — 별도 분기 불요)
  const overlayCells = useMemo(
    () => buildHomeOverlayCells(activeTheme, themeCells, OCCUPIED_CELLS),
    [activeTheme, themeCells],
  );
  const routeOverlay = useMemo(
    () => buildRouteOverlay(activeTheme, MOCK_ROUTE),
    [activeTheme],
  );

  // 격자선 파생 (MSG-263 AC 9·13) — idle마다 뷰포트∩부산 경계·한 화면 버퍼로 재계산.
  // 줌 게이트(14 미만 숨김, D4)는 파생이 판정하고, bounds 준비 전(지도 로드 전)에는 빈 목록
  const gridLines = useMemo(
    () => (viewportBounds ? buildGridLines(viewportBounds, zoom) : []),
    [viewportBounds, zoom],
  );

  // "전체 보기" — 브라우즈(전체 조회): 이전 필터를 비우고 탐색으로 이동.
  // 요약·상세 패널이 동일 동작을 공유한다 (MSG-253 AC 11)
  const handleViewAll = useCallback(() => {
    clearFilters();
    navigate(ROUTES.explore);
  }, [clearFilters, navigate]);

  // 셀 탭 → 상세 오픈/무시 판정 (AC 9·10) — 판정은 순수 함수, 스토어는 상태만
  const handleCellTap = useCallback(
    (cellId: string) => {
      const themeCellIds = themeCells.map((c) => c.id);
      if (!canOpenDetail(activeTheme, cellId, themeCellIds, OCCUPIED_IDS)) return;
      selectCell(cellId);
    },
    [activeTheme, themeCells, selectCell],
  );

  // 오버레이 게시 — 홈 마운트 중 유지, 이탈 시 해제 (도감 DexPanel 게시 선례).
  // 격자선도 같은 effect에서 게시한다 — cleanup(clear)이 전 슬롯을 비우므로 게시를 나누면
  // 한쪽 재게시 때 다른 쪽이 유실된다 (MSG-263 AC 16: 홈 이탈 시 격자도 함께 해제)
  useEffect(() => {
    setCells(overlayCells);
    setRoute(routeOverlay);
    setGridLines(gridLines);
    setOnCellClick(handleCellTap);
    return () => clearOverlays();
  }, [
    overlayCells,
    routeOverlay,
    gridLines,
    handleCellTap,
    setCells,
    setRoute,
    setGridLines,
    setOnCellClick,
    clearOverlays,
  ]);

  // 홈 이탈(다른 섹션 라우트로 언마운트) 시 칩·셀 상세 초기화 (AC 14) — 복귀 화면이 기본 상태.
  // 접힘은 셸이 display:none으로 숨겨 언마운트되지 않으므로 상태가 유지된다 (A6 정합)
  useEffect(() => resetThemeFilter, [resetThemeFilter]);

  // 상세 표시 모델 파생 (AC 9·10) — 열림 판정(canOpenDetail)상 route 활성 중에는 열리지 않는다
  const detail = useMemo(() => {
    if (selectedCellId === null) return null;
    const cell = MOCK_CELLS.find((c) => c.id === selectedCellId);
    if (!cell) return null;
    return deriveHomeCellDetail({
      cell,
      activeTheme: activeTheme === "route" ? null : activeTheme,
      occupied: OCCUPIED_IDS.includes(cell.id),
      myVideoIds: myVideoIdsOf(MOCK_COLLECTED_VIDEOS, cell.id),
    });
  }, [selectedCellId, activeTheme]);

  return (
    <>
      <aside className="pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-97 flex-col gap-sm bg-background p-md shadow-raised">
        {/* 검색은 드롭다운으로 그 자리에서 — 확정 시 탐색 그리드로 이동해 결과 표시 */}
        <SearchBox />
        {detail ? (
          <HomeCellDetailPanel
            detail={detail}
            onClose={closeDetail}
            onViewAll={handleViewAll}
          />
        ) : (
          <CellSummaryPanel onViewAll={handleViewAll} onCellSelect={moveTo} />
        )}
      </aside>
      {/* 상단 테마 칩 — 좌측 패널 오른쪽 홈 오버레이 (AC 1, A6) */}
      <ThemeChipsBar />
    </>
  );
};
