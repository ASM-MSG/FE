import { useCallback, useEffect, useMemo } from "react";
import { Toast } from "@fillmap/ui-web";
import { decodeGridCenter } from "@/entities/cell";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { canOpenDetail } from "@/features/map-home/model/home-cell-detail";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { MAP_SCALE_500M_ZOOM } from "@/features/map-home/model/map-scale";
import { missionGridIdsInBounds } from "@/features/map-home/model/mission";
import {
  buildCourseLabels,
  buildCourseRoutes,
  buildMissionCells,
  buildMissionLabels,
} from "@/features/map-home/model/mission-overlay";
import { useMissionSelectionStore } from "@/features/map-home/model/mission-selection-store";
import {
  toCourseView,
  toMissionView,
} from "@/features/map-home/model/mission-view";
import { homePanelKind } from "@/features/map-home/model/panel-branch";
import { THEME_META } from "@/features/map-home/model/theme";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import {
  buildHomeOverlayCells,
  emphasizeCell,
  themeCellGridIds,
} from "@/features/map-home/model/theme-overlay";
import { useActiveMissionsQuery } from "@/features/map-home/model/use-active-missions-query";
import { useCollectedGridsQuery } from "@/features/map-home/model/use-collected-grids-query";
import { useGridCardPlay } from "@/features/map-home/model/use-grid-card-play";
import { useGridDetailQuery } from "@/features/map-home/model/use-grid-detail-query";
import { useGridHourlyQuery } from "@/features/map-home/model/use-grid-hourly-query";
import { useGridNamesQuery } from "@/features/map-home/model/use-grid-names-query";
import { useGridVideosQuery } from "@/features/map-home/model/use-grid-videos-query";
import { useHotRegionSummary } from "@/features/map-home/model/use-hot-region-summary";
import { HOT_SAMPLE_GRID_LIMIT } from "@/features/map-home/model/hot-region-summary";
import { useMultiGridVideosQuery } from "@/features/map-home/model/use-multi-grid-videos-query";
import { useOccupiedGridsQuery } from "@/features/map-home/model/use-occupied-grids-query";
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { useRegionPanelStore } from "@/features/region/model/region-panel-store";
import { useReverseGeocodeQuery } from "@/features/region/model/use-reverse-geocode-query";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import { formatMonthDay } from "@/shared/format";
import { useMapOverlayStore } from "@/widgets/map-shell/map-overlay-store";
import { useSidebarStore } from "@/widgets/map-shell/sidebar-store";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";
import { VideoMiniPanel } from "@/widgets/video-mini-panel/VideoMiniPanel";
import { CourseDetailPanel } from "./ui/CourseDetailPanel";
import { CourseListPanel } from "./ui/CourseListPanel";
import {
  HomeCellDetailError,
  HomeCellDetailLoading,
  HomeCellDetailPanel,
} from "./ui/HomeCellDetailPanel";
import { HomeSearchBox } from "./ui/HomeSearchBox";
import { HotRegionPanel } from "./ui/HotRegionPanel";
import { MissionDetailPanel } from "./ui/MissionDetailPanel";
import { MissionListPanel } from "./ui/MissionListPanel";
import { RegionPanel } from "./ui/RegionPanel";
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

  // 미션 진행도의 분자 — 내 수집 격자 (보호 API라 비로그인은 빈 집합)
  const collected = useCollectedGridsQuery();
  const missions = useActiveMissionsQuery();

  // 미션 표시 모델 — 목록·상세·오버레이가 같은 파생을 공유한다 (mission-view).
  // now는 상태 배지(D-N·오늘까지) 판정에 쓰이고 마운트 시점에 고정한다 — 매 렌더 새 Date면
  // 파생이 통째로 무효화되고, 하루가 지나 배지가 바뀌는 경우는 홈 재진입으로 갱신된다
  const now = useMemo(() => new Date(), []);
  // 칩을 두 갈래로 좁힌다 — 축제·팝업은 같은 카드/상세를 색만 달리 쓰고, 경로추천만
  // 라인·포토스팟이라는 다른 모양이다
  const eventChip =
    activeTheme === "festival" || activeTheme === "popup" ? activeTheme : null;
  const isRouteChip = activeTheme === "route";

  const missionViews = useMemo(() => {
    if (eventChip === null) return [];
    return missions.buckets[eventChip].map((dto) =>
      toMissionView(dto, collected.collected, now),
    );
  }, [eventChip, missions.buckets, collected.collected, now]);

  const courseViews = useMemo(() => {
    if (!isRouteChip) return [];
    return missions.buckets.route.map((dto) =>
      toCourseView(dto, collected.collected, now),
    );
  }, [isRouteChip, missions.buckets, collected.collected, now]);

  const selectedMission = useMemo(
    () => missionViews.find((v) => v.missionId === selectedMissionId) ?? null,
    [missionViews, selectedMissionId],
  );
  const selectedCourse = useMemo(
    () => courseViews.find((v) => v.missionId === selectedMissionId) ?? null,
    [courseViews, selectedMissionId],
  );

  // 핫구역 동 요약 (AC 8~10) — 칩이 핫구역일 때만 의미가 있으나 훅은 항상 호출한다
  // (조건부 훅 금지). 행정동이 null이면 내부에서 빈 요약으로 떨어진다
  const hotSummary = useHotRegionSummary({
    bounds: activeTheme === "hot" ? viewportBounds : null,
    regionName:
      activeTheme === "hot" ? (currentRegion?.regionName ?? null) : null,
    regionCode:
      activeTheme === "hot" ? (currentRegion?.regionCode ?? null) : null,
  });

  // 미션 상세 피드 — 표본 격자 상한은 동 요약과 같은 눈금 (요청 수를 격자 수에 비례시키지 않는다).
  // 상세는 선택된 미션 하나뿐이라 그 미션의 경계 안에서만 격자를 펼친다(뷰포트 무관 —
  // 화면 밖 칸의 영상도 "이 미션의 영상"이다)
  const missionFeedGridIds = useMemo(() => {
    const shape = selectedMission?.shape;
    if (!shape?.bbox) return [];
    return missionGridIdsInBounds(shape, shape.bbox).slice(
      0,
      HOT_SAMPLE_GRID_LIMIT,
    );
  }, [selectedMission]);
  const missionFeed = useMultiGridVideosQuery(missionFeedGridIds);

  // 코스 상세의 포토스팟 이름 — 미션 응답에 없어 격자별로 받아온다 (코스 상세를 열 때만)
  const spotGridIds = useMemo(
    () => selectedCourse?.spots.map((s) => s.gridId) ?? [],
    [selectedCourse],
  );
  const spotNames = useGridNamesQuery(spotGridIds);

  // 지도 게시 셀 — 칩별로 소스가 다르다: 핫구역은 그 동의 핫구역 격자, 축제·팝업·코스는
  // 미션 shape에서 파생한 타일. 강조 대상은 호버 > 선택 순 (호버가 더 즉각적인 의도다)
  const focusedMissionId = hoveredMissionId ?? selectedMissionId;
  const overlayCells = useMemo(() => {
    if (activeTheme === "hot")
      return buildHomeOverlayCells("hot", hotSummary.cells, occupiedIds);
    // 미션 타일은 뷰포트가 정해진 뒤에만 만든다 — 지도 준비 전(null)에는 그릴 화면이 없다
    if (viewportBounds === null) return [];
    if (isRouteChip)
      return buildMissionCells(
        selectedCourse ? [selectedCourse] : courseViews,
        THEME_META.route.color,
        occupiedIds,
        focusedMissionId,
        viewportBounds,
      );
    if (eventChip !== null)
      return buildMissionCells(
        selectedMission ? [selectedMission] : missionViews,
        THEME_META[eventChip].color,
        occupiedIds,
        focusedMissionId,
        viewportBounds,
      );
    return [];
  }, [
    activeTheme,
    eventChip,
    isRouteChip,
    hotSummary.cells,
    occupiedIds,
    missionViews,
    courseViews,
    selectedMission,
    selectedCourse,
    focusedMissionId,
    viewportBounds,
  ]);

  // 코스 라인 — 상세를 열면 그 코스만 남긴다 (AC 18의 코스판)
  const routeOverlays = useMemo(() => {
    if (!isRouteChip || viewportBounds === null) return [];
    return buildCourseRoutes(
      selectedCourse ? [selectedCourse] : courseViews,
      THEME_META.route.color,
      viewportBounds,
    );
  }, [isRouteChip, courseViews, selectedCourse, viewportBounds]);

  const labelOverlays = useMemo(() => {
    if (viewportBounds === null) return [];
    if (isRouteChip)
      return buildCourseLabels(
        selectedCourse ? [selectedCourse] : courseViews,
        THEME_META.route.color,
        viewportBounds,
      );
    if (eventChip !== null)
      return buildMissionLabels(
        selectedMission ? [selectedMission] : missionViews,
        THEME_META[eventChip].color,
        selectedMission ? selectedMission.missionId : focusedMissionId,
        viewportBounds,
      );
    return [];
  }, [
    eventChip,
    isRouteChip,
    courseViews,
    missionViews,
    selectedCourse,
    selectedMission,
    focusedMissionId,
    viewportBounds,
  ]);

  // 지역 격자 카드 클릭 (MSG-328) — 좌측은 지역 패널 그대로 두고 오른쪽 미니 패널에서
  // 첫 영상만 재생한다. 재생 중 격자는 아래 게시 셀에 테두리 강조로 얹는다
  const cardPlay = useGridCardPlay();

  useEffect(() => {
    if (cardPlay.notice === null) return;
    const timer = setTimeout(cardPlay.dismissNotice, CARD_PLAY_TOAST_MS);
    return () => clearTimeout(timer);
  }, [cardPlay.notice, cardPlay.dismissNotice]);

  const publishedCells = useMemo(
    () => emphasizeCell(overlayCells, cardPlay.playingGridId, occupiedIds),
    [overlayCells, cardPlay.playingGridId, occupiedIds],
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
          overlayCells.map((cell) => cell.id),
    [activeTheme, hotSummary.cells, overlayCells],
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
    setRoutes(routeOverlays);
    setLabels(labelOverlays);
    setOnCellClick(handleCellTap);
    return () => clearOverlays();
  }, [
    publishedCells,
    routeOverlays,
    labelOverlays,
    handleCellTap,
    setCells,
    setRoutes,
    setLabels,
    setOnCellClick,
    clearOverlays,
  ]);

  // 경로추천 칩을 켜면 축척 500m가 보이는 줌으로 맞춘다 (AC 19) — 코스는 동 하나보다
  // 넓어 기본 줌(16)에서는 라인이 화면 밖으로 나간다
  useEffect(() => {
    if (activeTheme === "route") zoomTo(MAP_SCALE_500M_ZOOM);
  }, [activeTheme, zoomTo]);

  useHomeEntryLifecycle();

  // 격자 상세 (MSG-325·326) — 칩 종류와 무관하게 같은 패널을 쓴다
  const {
    detail,
    isError: detailFailed,
    retry: retryDetail,
  } = useGridDetailQuery(selectedCellId, activeTheme);
  const gridVideos = useGridVideosQuery(selectedCellId);
  const hourly = useGridHourlyQuery(selectedCellId);

  // 격자 상세의 맥락 줄 — 어디서 내려왔는지에 따라 다르다 (AC 11·24)
  const collectedGrid = useMemo(
    () => collected.grids.find((g) => g.gridId === selectedCellId) ?? null,
    [collected.grids, selectedCellId],
  );
  const selectedSpot = useMemo(
    () =>
      selectedCourse?.spots.find((s) => s.gridId === selectedCellId) ?? null,
    [selectedCourse, selectedCellId],
  );
  const gridContextLine = selectedSpot
    ? `${selectedCourse?.title} ${selectedSpot.order}번째 스팟 · ${selectedSpot.visited ? "방문 완료" : "미방문"}`
    : activeTheme === "hot"
      ? [
          `핫구역 안 ${hotSummary.hotGridIds.length}칸`,
          collectedGrid
            ? `${formatMonthDay(collectedGrid.firstCollectedAt)}부터 내가 점령 중`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : undefined;

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

        {panel === "grid-detail" ? (
          detail ? (
            <HomeCellDetailPanel
              detail={detail}
              videos={gridVideos}
              onVideoSelect={openMiniPanel}
              onClose={closeDetailMiniFirst}
              onViewAll={handleViewAll}
              onBack={activeTheme !== null ? closeDetail : undefined}
              contextLine={gridContextLine}
              extraBadgeLabel={
                selectedSpot ? `코스 ${selectedSpot.order}번` : undefined
              }
              chart={hourly.chart.hasData ? hourly.chart : undefined}
            />
          ) : detailFailed ? (
            <HomeCellDetailError
              onRetry={retryDetail}
              onClose={closeDetailMiniFirst}
            />
          ) : (
            <HomeCellDetailLoading onClose={closeDetailMiniFirst} />
          )
        ) : panel === "hot-region" ? (
          <HotRegionPanel
            summary={hotSummary}
            regionName={currentRegion?.regionName ?? null}
            onVideoSelect={openMiniPanel}
            onViewAll={handleViewAll}
            onClose={closeThemeMiniFirst}
            onUpload={handleHotUpload}
          />
        ) : panel === "mission-detail" && selectedMission && eventChip ? (
          <MissionDetailPanel
            view={selectedMission}
            theme={eventChip}
            videos={missionFeed}
            onVideoSelect={openMiniPanel}
            onBack={clearMission}
            onClose={closeThemeMiniFirst}
          />
        ) : panel === "course-detail" && selectedCourse ? (
          <CourseDetailPanel
            view={selectedCourse}
            spotNames={spotNames}
            onSpotSelect={selectCell}
            onBack={clearMission}
            onClose={closeThemeMiniFirst}
          />
        ) : panel === "mission-list" && eventChip ? (
          <MissionListPanel
            views={missionViews}
            theme={eventChip}
            isPending={missions.isPending}
            isError={missions.isError}
            onRetry={missions.retry}
            onSelect={selectMission}
            onHover={hoverMission}
            onClose={closeThemeMiniFirst}
          />
        ) : panel === "course-list" ? (
          <CourseListPanel
            views={courseViews}
            isPending={missions.isPending}
            isError={missions.isError}
            onRetry={missions.retry}
            onSelect={selectMission}
            onHover={hoverMission}
            onClose={closeThemeMiniFirst}
          />
        ) : (
          <RegionPanel onGridSelect={cardPlay.play} />
        )}
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
