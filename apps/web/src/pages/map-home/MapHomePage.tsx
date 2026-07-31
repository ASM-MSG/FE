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
import { MOCK_ROUTE, themeCellsOf } from "@/features/map-home/model/theme";
import { deriveThemeFeed } from "@/features/map-home/model/theme-feed";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import {
  buildHomeOverlayCells,
  buildRouteOverlay,
} from "@/features/map-home/model/theme-overlay";
import { useMapOverlayStore } from "@/widgets/map-shell/map-overlay-store";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";
import { CellSummaryPanel } from "./ui/CellSummaryPanel";
import { HomeCellDetailPanel } from "./ui/HomeCellDetailPanel";
import { ThemeChipsBar } from "./ui/ThemeChipsBar";
import { ThemeFeedPanel } from "./ui/ThemeFeedPanel";

// 내 점령 셀 = 도감 수집 격자 재사용 (A2) — 표시는 셸 상시 층(MSG-263 D9) 소유이고,
// 홈은 빗금 판정(테마 셀 ∩ 점령)과 셀 상세 열림 판정에만 이 목록을 쓴다
const OCCUPIED_CELLS = MOCK_DEX.collectedCells.map(({ cellId, center }) => ({
  cellId,
  center,
}));
const OCCUPIED_IDS = OCCUPIED_CELLS.map((c) => c.cellId);

// 내 수집 영상 id 전체 — 테마 피드의 mine 판정 키 (MSG-277 AC 4). 영상 id는 셀 접두라 전역 유일
const MY_VIDEO_IDS = MOCK_COLLECTED_VIDEOS.map((v) => v.id);

/**
 * 홈 패널(`/`) — 지속 셸(MapShell)이 렌더한 지도 위에 얹는 388px 좌측 사이드바 + 상단 테마 칩.
 * 검색바 + 요약(CellSummaryPanel), 칩 클릭 시 테마 피드(ThemeFeedPanel — MSG-277),
 * 셀 선택 시 상세(HomeCellDetailPanel)로 전환된다 (MSG-252).
 * 테마 오버레이(점령·테마 셀·경로)는 map-overlay-store로 게시하고 렌더는 셸의 MapCanvas가
 * 담당한다 — 지도 SDK를 import하지 않는다(RN 경계). 접힘 시 칩·패널 모두 셸 래퍼로 숨는다(A6).
 */
export const MapHomePage = () => {
  const navigate = useNavigate();
  const { moveTo } = useMapShell();
  const clearFilters = useExploreFilterStore((s) => s.clearFilters);

  const activeTheme = useThemeFilterStore((s) => s.activeTheme);
  const toggleTheme = useThemeFilterStore((s) => s.toggle);
  const resetThemeFilter = useThemeFilterStore((s) => s.reset);
  const selectedCellId = useHomeCellDetailStore((s) => s.selectedCellId);
  const selectCell = useHomeCellDetailStore((s) => s.select);
  const closeDetail = useHomeCellDetailStore((s) => s.close);

  const setCells = useMapOverlayStore((s) => s.setCells);
  const setRoute = useMapOverlayStore((s) => s.setRoute);
  const setOnCellClick = useMapOverlayStore((s) => s.setOnCellClick);
  const clearOverlays = useMapOverlayStore((s) => s.clear);

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

  // 섹션 오버레이 게시(테마 셀·경로·클릭 핸들러) — 홈 마운트 중 유지, 이탈 시 해제.
  // 격자선·기본 점령 셀은 셸 상시 층 소유(MSG-263 D9)라 여기서 게시하지 않는다 —
  // 홈 이탈 clear()는 테마 오버레이만 걷어내고 격자·점령 표시는 유지된다 (AC 16·18)
  useEffect(() => {
    setCells(overlayCells);
    setRoute(routeOverlay);
    setOnCellClick(handleCellTap);
    return () => clearOverlays();
  }, [
    overlayCells,
    routeOverlay,
    handleCellTap,
    setCells,
    setRoute,
    setOnCellClick,
    clearOverlays,
  ]);

  // 홈 이탈(다른 섹션 라우트로 언마운트) 시 칩·셀 상세 초기화 (AC 14) — 복귀 화면이 기본 상태.
  // 접힘은 셸이 display:none으로 숨겨 언마운트되지 않으므로 상태가 유지된다 (A6 정합)
  useEffect(() => resetThemeFilter, [resetThemeFilter]);

  // 상세 표시 모델 파생 (AC 9·10) — MSG-277 AC 13: 경로추천도 다른 테마와 동일하게 상세를 연다
  const detail = useMemo(() => {
    if (selectedCellId === null) return null;
    const cell = MOCK_CELLS.find((c) => c.id === selectedCellId);
    if (!cell) return null;
    return deriveHomeCellDetail({
      cell,
      activeTheme,
      occupied: OCCUPIED_IDS.includes(cell.id),
      myVideoIds: myVideoIdsOf(MOCK_COLLECTED_VIDEOS, cell.id),
    });
  }, [selectedCellId, activeTheme]);

  // 테마 피드 파생 (MSG-277 AC 1·3) — 칩 클릭 즉시 피드, 표시는 아래 분기 우선순위를 따른다
  const themeFeed = useMemo(
    () =>
      activeTheme ? deriveThemeFeed(activeTheme, MOCK_CELLS, MY_VIDEO_IDS) : null,
    [activeTheme],
  );

  // 테마 피드 Escape 닫기 = 칩 해제와 동일 효과 (추정 6) — toggle이 상세 close도 동반하나
  // 피드 표시 중엔 상세가 이미 닫혀 있어 무해
  const closeThemeFeed = useCallback(() => {
    if (activeTheme) toggleTheme(activeTheme);
  }, [activeTheme, toggleTheme]);

  return (
    <>
      <aside className="pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-97 flex-col gap-sm bg-background p-md shadow-raised">
        {/* 검색은 드롭다운으로 그 자리에서 — 확정 시 탐색 그리드로 이동해 결과 표시 */}
        <SearchBox />
        {/* 분기 우선순위 (MSG-277 확정): 셀 상세 > 테마 피드 > 요약 — 테마 상세를 닫으면
            칩이 유지된 채 피드로 자연 복귀한다 (AC 13) */}
        {detail ? (
          <HomeCellDetailPanel
            detail={detail}
            onClose={closeDetail}
            onViewAll={handleViewAll}
          />
        ) : themeFeed ? (
          <ThemeFeedPanel feed={themeFeed} onClose={closeThemeFeed} />
        ) : (
          <CellSummaryPanel onViewAll={handleViewAll} onCellSelect={moveTo} />
        )}
      </aside>
      {/* 상단 테마 칩 — 좌측 패널 오른쪽 홈 오버레이 (AC 1, A6) */}
      <ThemeChipsBar />
    </>
  );
};
