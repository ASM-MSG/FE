import { useCallback, useEffect, useMemo } from "react";
import { MOCK_CELLS } from "@/entities/cell";
import { MOCK_COLLECTED_VIDEOS } from "@/entities/dex";
import { canOpenDetail } from "@/features/map-home/model/home-cell-detail";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { MOCK_ROUTE, themeCellsOf } from "@/features/map-home/model/theme";
import { deriveThemeFeed } from "@/features/map-home/model/theme-feed";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import {
  buildHomeOverlayCells,
  buildRouteOverlay,
  themeCellGridIds,
} from "@/features/map-home/model/theme-overlay";
import { useGridDetailQuery } from "@/features/map-home/model/use-grid-detail-query";
import { useGridVideosQuery } from "@/features/map-home/model/use-grid-videos-query";
import { useHotZoneCells } from "@/features/map-home/model/use-hotzones-query";
import { useOccupiedGridsQuery } from "@/features/map-home/model/use-occupied-grids-query";
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { useRegionPanelStore } from "@/features/region/model/region-panel-store";
import { useMapOverlayStore } from "@/widgets/map-shell/map-overlay-store";
import { useSidebarStore } from "@/widgets/map-shell/sidebar-store";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";
import { HomeSearchBox } from "./ui/HomeSearchBox";
import { RegionPanel } from "./ui/RegionPanel";
import {
  HomeCellDetailError,
  HomeCellDetailLoading,
  HomeCellDetailPanel,
} from "./ui/HomeCellDetailPanel";
import { ThemeChipsBar } from "./ui/ThemeChipsBar";
import { useHomeEntryLifecycle } from "./ui/use-home-entry-lifecycle";
import { ThemeFeedPanel } from "./ui/ThemeFeedPanel";
import { VideoMiniPanel } from "./ui/VideoMiniPanel";

// 내 수집 영상 id 전체 — 테마 피드의 mine 판정 키 (MSG-277 AC 4). 영상 id는 셀 접두라 전역 유일
const MY_VIDEO_IDS = MOCK_COLLECTED_VIDEOS.map((v) => v.videoId);

/**
 * Escape 우선순위 래핑 (MSG-277 3차 AC 13) — 미니 패널이 열려 있으면 그것만 닫고,
 * 아니면 원래 닫기를 실행한다. 패널의 useEscapeClose 훅·onClose 계약은 불변 —
 * 우선순위는 페이지 레벨 콜백 조합으로만 해결한다 (스펙 재사용 항목).
 */
const withMiniPanelPriority = (close: () => void) => () => {
  const mini = useVideoMiniPanelStore.getState();
  if (mini.selected) {
    mini.close();
    return;
  }
  close();
};

/**
 * 홈 패널(`/`) — 지속 셸(MapShell)이 렌더한 지도 위에 얹는 388px 좌측 사이드바 + 상단 테마 칩.
 * 검색바(HomeSearchBox) + 지역 격자 리스트(RegionPanel — MSG-328), 칩 클릭 시 테마 피드
 * (ThemeFeedPanel — MSG-277), 셀 선택 시 상세(HomeCellDetailPanel)로 전환된다 (MSG-252).
 * 테마 오버레이(점령·테마 셀·경로)는 map-overlay-store로 게시하고 렌더는 셸의 MapCanvas가
 * 담당한다 — 지도 SDK를 import하지 않는다(RN 경계). 접힘 시 칩·패널 모두 셸 래퍼로 숨는다(A6).
 */
export const MapHomePage = () => {
  const { moveTo } = useMapShell();

  const activeTheme = useThemeFilterStore((s) => s.activeTheme);
  const toggleTheme = useThemeFilterStore((s) => s.toggle);
  const selectedCellId = useHomeCellDetailStore((s) => s.selectedCellId);
  const selectCell = useHomeCellDetailStore((s) => s.select);
  const closeDetail = useHomeCellDetailStore((s) => s.close);
  const miniSelection = useVideoMiniPanelStore((s) => s.selected);
  const openMiniPanel = useVideoMiniPanelStore((s) => s.open);
  const closeMiniPanel = useVideoMiniPanelStore((s) => s.close);

  const setCells = useMapOverlayStore((s) => s.setCells);
  const setRoute = useMapOverlayStore((s) => s.setRoute);
  const setOnCellClick = useMapOverlayStore((s) => s.setOnCellClick);
  const clearOverlays = useMapOverlayStore((s) => s.clear);

  // 내 점령 격자 id — 빗금 판정(테마 셀 ∩ 점령)과 셀 상세 열림 판정용.
  // 표시는 셸 상시 층(MSG-263 D9) 소유이고, 홈은 같은 뷰포트 쿼리를 구독만 한다(캐시 공유)
  const viewportBounds = useViewportStore((s) => s.bounds);
  const { grids: occupiedGrids } = useOccupiedGridsQuery(viewportBounds);
  const occupiedIds = useMemo(
    () => occupiedGrids.map((g) => g.gridId),
    [occupiedGrids],
  );

  // 핫구역만 실 API, 나머지 3테마는 목 유지 (MSG-325 결정 3 — 서버에 대응 API가 없다)
  const hotZoneCells = useHotZoneCells(viewportBounds);
  const themeCells = useMemo(() => {
    if (activeTheme === null) return [];
    return activeTheme === "hot" ? hotZoneCells : themeCellsOf(activeTheme);
  }, [activeTheme, hotZoneCells]);

  // 강조 셀·경로 파생 (AC 2·6·7·8) — 뷰포트와 무관하게 게시한다: 활성 테마 셀이 화면 밖이면
  // 지도에 아무것도 더 그려지지 않아 기본 상태 그대로 보인다 (AC 11 — 별도 분기 불요)
  const overlayCells = useMemo(
    () => buildHomeOverlayCells(activeTheme, themeCells, occupiedIds),
    [activeTheme, themeCells, occupiedIds],
  );
  const routeOverlay = useMemo(
    () => buildRouteOverlay(activeTheme, MOCK_ROUTE),
    [activeTheme],
  );

  // 상세 패널의 "전체 보기" — 탐색 제거(MSG-328)로 상세를 닫고 패널 안 전체 지역
  // 리스트를 연다 (스펙 추정 3 — MSG-253 AC 11의 "탐색 이동" 대체)
  const openRegionList = useRegionPanelStore((s) => s.openRegionList);
  const handleViewAll = useCallback(() => {
    closeDetail();
    openRegionList();
  }, [closeDetail, openRegionList]);

  // 셀 탭 → 상세 오픈/무시 판정 (AC 9·10) — 판정은 순수 함수, 스토어는 상태만
  const expandSidebar = useSidebarStore((s) => s.setCollapsed);
  const handleCellTap = useCallback(
    (cellId: string) => {
      // 판정 id는 게시 id와 같은 규칙(좌표 유래 서버 gridId)이어야 한다 — 목 소스 테마의
      // ThemeCell.id는 목 라벨("A-14")이라 그대로 쓰면 상세가 열리지 않는다 (MSG-325 회귀 방지)
      const themeGridIds = themeCellGridIds(themeCells);
      if (!canOpenDetail(activeTheme, cellId, themeGridIds, occupiedIds))
        return;
      selectCell(cellId);
      // 접힘 상태에서도 색칠 셀 탭이면 상세가 보여야 한다 — 판정 통과 시에만 펼쳐,
      // 지도만 넓게 보려는 접힘을 무의미한 클릭이 해제하지 않는다
      expandSidebar(false);
    },
    [activeTheme, themeCells, occupiedIds, selectCell, expandSidebar],
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

  // 홈 진입/이탈 선택 수명주기 — AC 14 초기화 + 셸 선점 진입 보존 (StrictMode 회귀 테스트 포함)
  useHomeEntryLifecycle();

  // 상세 표시 모델 파생 (AC 9·10 → MSG-325 실 API) — 색칠 상태·대표 영상·행정동 3종 조합.
  // MSG-277 AC 13: 경로추천도 다른 테마와 동일하게 상세를 연다
  const {
    detail,
    isError: detailFailed,
    retry: retryDetail,
  } = useGridDetailQuery(selectedCellId, activeTheme);

  // 격자 영상 목록 (MSG-326 기준 8) — 상세와 독립 조회: 목록 실패·로딩은 피드 영역에서만
  // 분기하고 상세 성립을 막지 않는다. 선택이 없으면(null) 두 쿼리 모두 비활성 (기준 7)
  const gridVideos = useGridVideosQuery(selectedCellId);

  // 테마 피드 파생 (MSG-277 AC 1·3) — 칩 클릭 즉시 피드, 표시는 아래 분기 우선순위를 따른다
  const themeFeed = useMemo(
    () =>
      activeTheme
        ? deriveThemeFeed(activeTheme, MOCK_CELLS, MY_VIDEO_IDS)
        : null,
    [activeTheme],
  );

  // 테마 피드 Escape 닫기 = 칩 해제와 동일 효과 (추정 6) — toggle이 상세 close도 동반하나
  // 피드 표시 중엔 상세가 이미 닫혀 있어 무해
  const closeThemeFeed = useCallback(() => {
    if (activeTheme) toggleTheme(activeTheme);
  }, [activeTheme, toggleTheme]);

  // Escape는 미니 패널 먼저 (3차 AC 13 — 기확정 4): 미니 열림이면 미니만 닫고,
  // 재차 Escape가 기존 동작(상세/피드 닫힘). 패널 스모크 2케이스(onClose 계약)는 불변
  const closeDetailMiniFirst = useMemo(
    () => withMiniPanelPriority(closeDetail),
    [closeDetail],
  );
  const closeThemeFeedMiniFirst = useMemo(
    () => withMiniPanelPriority(closeThemeFeed),
    [closeThemeFeed],
  );

  return (
    <>
      <aside className="pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-97 flex-col gap-sm bg-background p-md shadow-raised">
        {/* 검색은 드롭다운으로 그 자리에서 — 결과 선택 시 지도 이동 (MSG-328 AC 16) */}
        <HomeSearchBox onPlaceSelect={moveTo} />
        {/* 분기 우선순위 (MSG-277 확정 → MSG-328 AC 18 유지): 셀 상세 > 테마 피드 > 지역
            격자 리스트 — 테마 상세를 닫으면 칩이 유지된 채 피드로 자연 복귀한다 (AC 13) */}
        {selectedCellId !== null ? (
          detail ? (
            <HomeCellDetailPanel
              detail={detail}
              videos={gridVideos}
              onVideoSelect={openMiniPanel}
              onClose={closeDetailMiniFirst}
              onViewAll={handleViewAll}
            />
          ) : detailFailed ? (
            // 실패를 로딩으로 위장하지 않는다 — 재시도 수단을 준다 (MSG-325 리뷰 반영)
            <HomeCellDetailError
              onRetry={retryDetail}
              onClose={closeDetailMiniFirst}
            />
          ) : (
            // 분기는 **선택 컨텍스트** 기준이다 — detail 기준으로 하면 격자를 바꿔 탭할 때
            // 새 응답 전까지 요약 패널로 튀었다 돌아온다 (MSG-325 리뷰 반영)
            <HomeCellDetailLoading onClose={closeDetailMiniFirst} />
          )
        ) : themeFeed ? (
          <ThemeFeedPanel
            feed={themeFeed}
            onVideoSelect={openMiniPanel}
            onClose={closeThemeFeedMiniFirst}
          />
        ) : (
          <RegionPanel onGridSelect={moveTo} />
        )}
      </aside>
      {/* 영상 미니 디테일 패널 — 좌측 패널 오른쪽 flush 보조 패널 (3차 AC 8~11).
          aside 뒤 형제라 접힘 시 셸 래퍼로 함께 숨는다 (추정 9) */}
      {miniSelection && (
        <VideoMiniPanel selected={miniSelection} onClose={closeMiniPanel} />
      )}
      {/* 상단 테마 칩 — 좌측 패널 오른쪽 홈 오버레이 (AC 1, A6). 미니 열림 시 우측 이동 (3차 AC 15) */}
      <ThemeChipsBar />
    </>
  );
};
