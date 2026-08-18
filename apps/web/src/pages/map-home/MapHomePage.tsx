import { useCallback, useMemo, useState } from "react";
import { decodeGridCenter } from "@/entities/cell";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { useMissionSelectionStore } from "@/features/map-home/model/mission-selection-store";
import { homePanelKind } from "@/features/map-home/model/panel-branch";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import { useChipEntry } from "@/features/map-home/model/use-chip-entry";
import { useGridCardPlay } from "@/features/map-home/model/use-grid-card-play";
import { useHomeMissions } from "@/features/map-home/model/use-home-missions";
import { useHomeGridDetail } from "@/features/map-home/model/use-home-grid-detail";
import { useHomeOverlays } from "@/features/map-home/model/use-home-overlays";
import { useHotRegionSummary } from "@/features/map-home/model/use-hot-region-summary";
import { useOccupiedGridsQuery } from "@/features/map-home/model/use-occupied-grids-query";
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { useRegionPanelStore } from "@/features/region/model/region-panel-store";
import { deriveReloadTarget } from "@/features/region/model/region-reload";
import { useReverseGeocodeQuery } from "@/features/region/model/use-reverse-geocode-query";
import { zoomForGridFocus } from "@/features/search/model/zone-search";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";
import { VideoMiniPanel } from "@/widgets/video-mini-panel/VideoMiniPanel";
import { CardPlayNotice } from "./ui/CardPlayNotice";
import { HomePanelSwitch } from "./ui/HomePanelSwitch";
import { HomeSearchBox } from "./ui/HomeSearchBox";
import { RegionReloadButton } from "./ui/RegionReloadButton";
import { useHomeEntryLifecycle } from "./ui/use-home-entry-lifecycle";
import { useHomeOverlayPublish } from "./ui/use-home-overlay-publish";

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
  const { moveTo, zoomTo, fitBounds } = useMapShell();
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

  // 내 점령 격자 id — 빗금 판정(테마 셀 ∩ 점령)과 셀 상세 열림 판정용.
  // 표시는 셸 상시 층(MSG-263 D9) 소유이고, 홈은 같은 뷰포트 쿼리를 구독만 한다(캐시 공유)
  const viewportBounds = useViewportStore((s) => s.bounds);
  const viewportCenter = useViewportStore((s) => s.center);
  const viewportZoom = useViewportStore((s) => s.zoom);
  // 지도 데이터의 bbox 정본은 **확정 영역**이다 (AC 12) — 지도를 미는 동안에는 갱신되지 않는다
  const committedRegion = useRegionPanelStore((s) => s.displayedRegion);
  const committedBounds = useRegionPanelStore((s) => s.committedBounds);
  const commitRegion = useRegionPanelStore((s) => s.commit);
  const panelMode = useRegionPanelStore((s) => s.mode);
  const { grids: occupiedGrids } = useOccupiedGridsQuery(committedBounds);
  const occupiedIds = useMemo(
    () => occupiedGrids.map((g) => g.gridId),
    [occupiedGrids],
  );

  // 현재 지도 중심 행정동 — "장소 불러오기" 버튼의 대상이자 칩 진입 확정 대상.
  // 화면 표시(헤더·핫구역 요약)는 확정 지역을 쓴다 (AC 13)
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
    progressFailed,
    retry: retryMissionList,
  } = useHomeMissions({ activeTheme, selectedMissionId, committedBounds });

  // 핫구역 동 요약 (AC 8~10) — 칩이 핫구역일 때만 의미가 있으나 훅은 항상 호출한다
  // (조건부 훅 금지). 행정동이 null이면 내부에서 빈 요약으로 떨어진다
  const hotSummary = useHotRegionSummary({
    bounds: activeTheme === "hot" ? committedBounds : null,
    regionName:
      activeTheme === "hot" ? (committedRegion?.regionName ?? null) : null,
    regionCode:
      activeTheme === "hot" ? (committedRegion?.regionCode ?? null) : null,
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
    viewportBounds: committedBounds,
  });

  // 지역 격자 카드 클릭 (MSG-328) — 좌측은 지역 패널 그대로 두고 오른쪽 미니 패널에서
  // 첫 영상만 재생한다. 재생 중 격자는 게시 셀에 테두리 강조로 얹는다
  const cardPlay = useGridCardPlay();

  // 격자 검색 하이라이트 (MSG-412 AC 5·6) — 마지막 선택 1건 유지, 새 선택 시 교체
  // (승인 — 자동 해제 없음). 페이지 로컬 상태로 충분하다(홈 이탈 시 함께 소멸)
  const [searchGridId, setSearchGridId] = useState<string | null>(null);
  const handleGridSelect = useCallback(
    (gridId: string) => {
      moveTo(decodeGridCenter(gridId));
      // 강조 전용 셀은 저줌 게이트에서 걷히므로 격자 최소 줌을 보장한다 (AC 5)
      const zoom = zoomForGridFocus(viewportZoom);
      if (zoom !== null) zoomTo(zoom);
      setSearchGridId(gridId);
    },
    [moveTo, zoomTo, viewportZoom],
  );

  // 게시 셀 파생·탭 판정·게시/해제 배선 (리뷰 반영 — 300줄 초과 분할)
  useHomeOverlayPublish({
    activeTheme,
    overlays,
    hotCells: hotSummary.cells,
    occupiedIds,
    playingGridId: cardPlay.playingGridId,
    searchGridId,
  });

  // 상세 패널의 "전체 보기" — 상세를 닫고 패널 안 전체 지역 리스트를 연다 (MSG-328)
  const openRegionList = useRegionPanelStore((s) => s.openRegionList);
  const handleViewAll = useCallback(() => {
    closeDetail();
    openRegionList();
  }, [closeDetail, openRegionList]);

  // 칩 활성화 진입 — 칩에 맞는 줌으로 옮기고 그 화면을 1회 확정한다 (AC 6·9)
  useChipEntry({
    activeTheme,
    bounds: viewportBounds,
    zoom: viewportZoom,
    region: currentRegion,
    zoomTo,
    commit: commitRegion,
  });

  useHomeEntryLifecycle();

  // 격자 상세 (MSG-325·326) — 쿼리 3종 + 맥락 줄 파생은 훅이 소유한다 (리뷰 반영: 페이지 분할)
  const gridDetail = useHomeGridDetail({
    selectedGridId: selectedCellId,
    activeTheme,
    selectedCourse,
    collectedGrids,
    hotGridCount: hotSummary.hotGridIds.length,
    progressFailed,
  });

  // 코스를 고르면 그 코스가 다 보이게 지도를 옮긴다 (사용자 요청) — 라인·번호 마커가
  // 화면 밖에 있으면 순서를 읽을 수 없다. 상세 오버레이는 확정 영역이 아니라 코스 자기
  // 경계로 그려지므로(use-home-overlays) 이동해도 잘리지 않는다
  const handleSelectMission = useCallback(
    (missionId: number) => {
      selectMission(missionId);
      const bbox = courseViews.find((c) => c.missionId === missionId)?.shape
        .bbox;
      if (bbox) fitBounds(bbox);
    },
    [selectMission, courseViews, fitBounds],
  );

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

  // "장소 불러오기" (AC 10) — 칩 4종 화면과 지역 격자 패널이 같은 버튼을 공유하므로
  // 패널이 아니라 페이지가 소유한다. 판정은 순수 함수(region-reload) 몫
  const reloadTarget = deriveReloadTarget({
    isDetailPanel:
      panel === "grid-detail" ||
      panel === "mission-detail" ||
      panel === "course-detail",
    isGridListMode: panelMode === "grids",
    committedRegionCode: committedRegion?.regionCode ?? null,
    currentRegion,
    zoom: viewportZoom,
  });

  return (
    <>
      <aside className="pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-97 flex-col gap-sm bg-background p-md shadow-raised">
        {/* 검색은 드롭다운으로 그 자리에서 — 결과 선택 시 지도 이동 (MSG-328 AC 16).
            격자 결과는 이동+줌 보장+하이라이트, 구역 결과는 fitBounds (MSG-412 AC 5·7) */}
        <HomeSearchBox
          onPlaceSelect={moveTo}
          onGridSelect={handleGridSelect}
          onZoneSelect={fitBounds}
        />

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
          regionName={committedRegion?.regionName ?? null}
          onHotUpload={handleHotUpload}
          missionViews={missionViews}
          courseViews={courseViews}
          selectedMission={selectedMission}
          selectedCourse={selectedCourse}
          missionFeed={missionFeed}
          spotNames={spotNames}
          listPending={missionsPending}
          listFailed={missionListFailed}
          progressFailed={progressFailed}
          onListRetry={retryMissionList}
          onSelectMission={handleSelectMission}
          onHoverMission={hoverMission}
          onBackToList={clearMission}
          onSelectSpot={selectCell}
          onVideoSelect={openMiniPanel}
          onCloseTheme={closeThemeMiniFirst}
          onGridCardSelect={cardPlay.play}
        />
        {reloadTarget && (
          <RegionReloadButton
            regionName={reloadTarget.regionName}
            onClick={() => commitRegion(reloadTarget, viewportBounds)}
          />
        )}
      </aside>

      {miniSelection && (
        <VideoMiniPanel selected={miniSelection} onClose={closeMiniPanel} />
      )}
      <CardPlayNotice
        notice={cardPlay.notice}
        onDismiss={cardPlay.dismissNotice}
      />
    </>
  );
};
