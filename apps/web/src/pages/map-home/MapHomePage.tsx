import { useCallback, useEffect, useMemo, useRef } from "react";
import { Toast } from "@fillmap/ui-web";
import { decodeGridCenter } from "@/entities/cell";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { canOpenDetail } from "@/features/map-home/model/home-cell-detail";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { MAP_SCALE_500M_ZOOM } from "@/features/map-home/model/map-scale";
import { useMissionSelectionStore } from "@/features/map-home/model/mission-selection-store";
import { homePanelKind } from "@/features/map-home/model/panel-branch";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import {
  emphasizeCell,
  themeCellGridIds,
} from "@/features/map-home/model/theme-overlay";
import { useGridCardPlay } from "@/features/map-home/model/use-grid-card-play";
import { useHomeMissions } from "@/features/map-home/model/use-home-missions";
import { useHomeGridDetail } from "@/features/map-home/model/use-home-grid-detail";
import { useHomeOverlays } from "@/features/map-home/model/use-home-overlays";
import { useHotRegionSummary } from "@/features/map-home/model/use-hot-region-summary";
import { useOccupiedGridsQuery } from "@/features/map-home/model/use-occupied-grids-query";
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { useRegionPanelStore } from "@/features/region/model/region-panel-store";
import { useReverseGeocodeQuery } from "@/features/region/model/use-reverse-geocode-query";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import { useMapOverlayStore } from "@/widgets/map-shell/map-overlay-store";
import { useSidebarStore } from "@/widgets/map-shell/sidebar-store";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";
import { VideoMiniPanel } from "@/widgets/video-mini-panel/VideoMiniPanel";
import { HomePanelSwitch } from "./ui/HomePanelSwitch";
import { HomeSearchBox } from "./ui/HomeSearchBox";
import { ThemeChipsBar } from "./ui/ThemeChipsBar";
import { useHomeEntryLifecycle } from "./ui/use-home-entry-lifecycle";

/** 카드 재생 안내 토스트 자동 소멸(ms) — ReportDialog TOAST_DURATION_MS 관례와 동일 값 */
const CARD_PLAY_TOAST_MS = 3000;

/** 카드 재생 안내 문구 — useGridCardPlay notice 사유별 */
const CARD_PLAY_NOTICE_MESSAGE = {
  empty: "이 격자에 재생할 영상이 없어요.",
  error: "영상 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
} as const;

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
 *
 * MSG-395: 칩 4종이 각자 다른 화면을 갖는다 — 핫구역은 행정동 요약(HotRegionPanel),
 * 지역축제·팝업스토어는 미션 목록/상세, 경로추천은 코스 목록/상세. 지역축제·팝업·코스는
 * 목(MOCK_THEME_CELLS·MOCK_ROUTE)을 걷어내고 `/api/missions/active` 실 데이터를 쓴다.
 * 좌측 패널 분기는 `panel-branch`(순수 함수)가 결정하고 여기서는 조립만 한다.
 *
 * 테마 오버레이(점령·미션 타일·코스 라인·이름표)는 map-overlay-store로 게시하고 렌더는
 * 셸의 MapCanvas가 담당한다 — 지도 SDK를 import하지 않는다(RN 경계).
 */
export const MapHomePage = () => {
  const { moveTo, zoomTo } = useMapShell();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const activeTheme = useThemeFilterStore((s) => s.activeTheme);
  const toggleTheme = useThemeFilterStore((s) => s.toggle);
  const selectedCellId = useHomeCellDetailStore((s) => s.selectedCellId);
  const selectCell = useHomeCellDetailStore((s) => s.select);
  const closeDetail = useHomeCellDetailStore((s) => s.close);
  const selectedMissionId = useMissionSelectionStore(
    (s) => s.selectedMissionId,
  );
  const hoveredMissionId = useMissionSelectionStore((s) => s.hoveredMissionId);
  const selectMission = useMissionSelectionStore((s) => s.select);
  const clearMission = useMissionSelectionStore((s) => s.clear);
  const hoverMission = useMissionSelectionStore((s) => s.hover);
  const miniSelection = useVideoMiniPanelStore((s) => s.selected);
  const openMiniPanel = useVideoMiniPanelStore((s) => s.open);
  const closeMiniPanel = useVideoMiniPanelStore((s) => s.close);

  const setCells = useMapOverlayStore((s) => s.setCells);
  const setRoutes = useMapOverlayStore((s) => s.setRoutes);
  const setLabels = useMapOverlayStore((s) => s.setLabels);
  const setOnCellClick = useMapOverlayStore((s) => s.setOnCellClick);
  const clearOverlays = useMapOverlayStore((s) => s.clear);

  // 내 점령 격자 id — 빗금 판정(테마 셀 ∩ 점령)과 셀 상세 열림 판정용.
  // 표시는 셸 상시 층(MSG-263 D9) 소유이고, 홈은 같은 뷰포트 쿼리를 구독만 한다(캐시 공유)
  const viewportBounds = useViewportStore((s) => s.bounds);
  const viewportCenter = useViewportStore((s) => s.center);
  const { grids: occupiedGrids } = useOccupiedGridsQuery(viewportBounds);
  const occupiedIds = useMemo(
    () => occupiedGrids.map((g) => g.gridId),
    [occupiedGrids],
  );

  // 현재 행정동 — 핫구역 요약의 범위. RegionPanel과 같은 쿼리 키라 캐시를 공유한다
  const reverse = useReverseGeocodeQuery(
    isAuthenticated ? viewportCenter : null,
  );
  const currentRegion = reverse.region;

  // 미션 목록·선택·상세 부재료 — 파생은 훅이 소유한다 (리뷰 반영: 페이지 분할)
  const {
    eventChip,
    isRouteChip,
    missionViews,
    courseViews,
    selectedMission,
    selectedCourse,
    missionFeed,
    spotNames,
    collectedGrids,
    isPending: missionsPending,
    isError: missionListFailed,
    retry: retryMissionList,
  } = useHomeMissions({ activeTheme, selectedMissionId });

  // 핫구역 동 요약 (AC 8~10) — 칩이 핫구역일 때만 의미가 있으나 훅은 항상 호출한다
  // (조건부 훅 금지). 행정동이 null이면 내부에서 빈 요약으로 떨어진다
  const hotSummary = useHotRegionSummary({
    bounds: activeTheme === "hot" ? viewportBounds : null,
    regionName:
      activeTheme === "hot" ? (currentRegion?.regionName ?? null) : null,
    regionCode:
      activeTheme === "hot" ? (currentRegion?.regionCode ?? null) : null,
  });

  // 지도 오버레이 파생 — 칩별 소스 분기·뷰포트 클리핑은 훅이 소유한다 (리뷰 반영: 페이지 분할)
  const focusedMissionId = hoveredMissionId ?? selectedMissionId;
  const overlays = useHomeOverlays({
    activeTheme,
    eventChip,
    isRouteChip,
    hotCells: hotSummary.cells,
    missionViews,
    courseViews,
    selectedMission,
    selectedCourse,
    focusedMissionId,
    occupiedIds,
    viewportBounds,
  });

  // 지역 격자 카드 클릭 (MSG-328) — 좌측은 지역 패널 그대로 두고 오른쪽 미니 패널에서
  // 첫 영상만 재생한다. 재생 중 격자는 아래 게시 셀에 테두리 강조로 얹는다
  const cardPlay = useGridCardPlay();

  useEffect(() => {
    if (cardPlay.notice === null) return;
    const timer = setTimeout(cardPlay.dismissNotice, CARD_PLAY_TOAST_MS);
    return () => clearTimeout(timer);
  }, [cardPlay.notice, cardPlay.dismissNotice]);

  const publishedCells = useMemo(
    () => emphasizeCell(overlays.cells, cardPlay.playingGridId, occupiedIds),
    [overlays.cells, cardPlay.playingGridId, occupiedIds],
  );

  // 상세 패널의 "전체 보기" — 상세를 닫고 패널 안 전체 지역 리스트를 연다 (MSG-328)
  const openRegionList = useRegionPanelStore((s) => s.openRegionList);
  const handleViewAll = useCallback(() => {
    closeDetail();
    openRegionList();
  }, [closeDetail, openRegionList]);

  // 셀 탭 → 상세 오픈/무시 판정 (AC 11) — 판정은 순수 함수, 스토어는 상태만.
  // 판정 id는 게시 id와 같은 규칙(좌표 유래 서버 gridId)이어야 한다
  const expandSidebar = useSidebarStore((s) => s.setCollapsed);
  const clickableGridIds = useMemo(
    () =>
      activeTheme === "hot"
        ? themeCellGridIds(hotSummary.cells)
        : // 재생 강조 셀(emphasizeCell)은 미션 타일이 아니므로 판정 집합에서 제외한다 —
          // 게시 목록이 아니라 오버레이 원본을 본다
          overlays.cells.map((cell) => cell.id),
    [activeTheme, hotSummary.cells, overlays.cells],
  );
  const handleCellTap = useCallback(
    (cellId: string) => {
      if (!canOpenDetail(activeTheme, cellId, clickableGridIds, occupiedIds))
        return;
      selectCell(cellId);
      expandSidebar(false);
    },
    [activeTheme, clickableGridIds, occupiedIds, selectCell, expandSidebar],
  );

  // 섹션 오버레이 게시 — 홈 마운트 중 유지, 이탈 시 해제. 격자선·기본 점령 셀은 셸 상시 층
  // 소유(MSG-263 D9)라 여기서 게시하지 않는다
  useEffect(() => {
    setCells(publishedCells);
    setRoutes(overlays.routes);
    setLabels(overlays.labels);
    setOnCellClick(handleCellTap);
    return () => clearOverlays();
  }, [
    publishedCells,
    overlays.routes,
    overlays.labels,
    handleCellTap,
    setCells,
    setRoutes,
    setLabels,
    setOnCellClick,
    clearOverlays,
  ]);

  // 경로추천 칩을 켜면 축척 500m가 보이는 줌으로 맞춘다 (AC 19) — 코스는 동 하나보다
  // 넓어 기본 줌(16)에서는 라인이 화면 밖으로 나간다.
  // **지도 준비를 기다린다** (리뷰 반영): SDK 로드 전에는 `zoomTo`가 옵셔널 체이닝으로
  // 조용히 no-op이라, 진입 직후 칩을 누르면 그 세션 내내 줌이 안 맞았다. 뷰포트가
  // 들어오는 시점(=지도 생성 완료)까지 미뤘다가 활성화당 1회만 적용한다
  const routeZoomAppliedRef = useRef(false);
  useEffect(() => {
    if (activeTheme !== "route") {
      routeZoomAppliedRef.current = false;
      return;
    }
    if (routeZoomAppliedRef.current || viewportBounds === null) return;
    routeZoomAppliedRef.current = true;
    zoomTo(MAP_SCALE_500M_ZOOM);
  }, [activeTheme, viewportBounds, zoomTo]);

  useHomeEntryLifecycle();

  // 격자 상세 (MSG-325·326) — 쿼리 3종 + 맥락 줄 파생은 훅이 소유한다 (리뷰 반영: 페이지 분할)
  const gridDetail = useHomeGridDetail({
    selectedGridId: selectedCellId,
    activeTheme,
    selectedCourse,
    collectedGrids,
    hotGridCount: hotSummary.hotGridIds.length,
  });

  const openUploadModal = useUploadModalStore((s) => s.openModal);
  const handleHotUpload = useCallback(() => {
    const anchor = hotSummary.hotGridIds[0];
    openUploadModal(anchor ? decodeGridCenter(anchor) : viewportCenter);
  }, [hotSummary.hotGridIds, openUploadModal, viewportCenter]);

  const closeThemeFilter = useCallback(() => {
    if (activeTheme) toggleTheme(activeTheme);
  }, [activeTheme, toggleTheme]);

  // Escape는 미니 패널 먼저 (MSG-277 3차 AC 13)
  const closeDetailMiniFirst = useMemo(
    () => withMiniPanelPriority(closeDetail),
    [closeDetail],
  );
  const closeThemeMiniFirst = useMemo(
    () => withMiniPanelPriority(closeThemeFilter),
    [closeThemeFilter],
  );

  // 선택한 미션이 목록에 실제로 있을 때만 상세로 분기한다 (codex 리뷰 반영).
  // 재조회로 그 미션이 목록에서 빠지면 selectedMission이 null이 되는데, id만 보고
  // "mission-detail"로 분기하면 아래 JSX 가드가 전부 미끄러져 **칩이 켜진 채 지역
  // 패널**이 뜬다. 없는 미션은 선택이 없는 것으로 보아 목록으로 돌아간다
  const resolvedMissionId =
    (selectedMission ?? selectedCourse)?.missionId ?? null;
  const panel = homePanelKind({
    activeTheme,
    selectedMissionId: resolvedMissionId,
    selectedGridId: selectedCellId,
  });

  return (
    <>
      <aside className="pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-97 flex-col gap-sm bg-background p-md shadow-raised">
        {/* 검색은 드롭다운으로 그 자리에서 — 결과 선택 시 지도 이동 (MSG-328 AC 16) */}
        <HomeSearchBox onPlaceSelect={moveTo} />

        <HomePanelSwitch
          panel={panel}
          activeTheme={activeTheme}
          eventChip={eventChip}
          gridDetail={gridDetail.detail}
          gridVideos={gridDetail.videos}
          gridChart={gridDetail.chart}
          gridContextLine={gridDetail.contextLine}
          selectedSpot={gridDetail.selectedSpot}
          onCloseDetail={closeDetailMiniFirst}
          onBackFromDetail={closeDetail}
          onViewAll={handleViewAll}
          hotSummary={hotSummary}
          regionName={currentRegion?.regionName ?? null}
          onHotUpload={handleHotUpload}
          missionViews={missionViews}
          courseViews={courseViews}
          selectedMission={selectedMission}
          selectedCourse={selectedCourse}
          missionFeed={missionFeed}
          spotNames={spotNames}
          listPending={missionsPending}
          listFailed={missionListFailed}
          onListRetry={retryMissionList}
          onSelectMission={selectMission}
          onHoverMission={hoverMission}
          onBackToList={clearMission}
          onSelectSpot={selectCell}
          onVideoSelect={openMiniPanel}
          onCloseTheme={closeThemeMiniFirst}
          onGridCardSelect={cardPlay.play}
        />
      </aside>

      {miniSelection && (
        <VideoMiniPanel selected={miniSelection} onClose={closeMiniPanel} />
      )}
      <ThemeChipsBar />
      {cardPlay.notice && (
        <div className="pointer-events-none fixed inset-x-0 bottom-md z-50 mx-auto w-[calc(100%-2rem)] max-w-120 px-md">
          <Toast title={CARD_PLAY_NOTICE_MESSAGE[cardPlay.notice]} />
        </div>
      )}
    </>
  );
};
