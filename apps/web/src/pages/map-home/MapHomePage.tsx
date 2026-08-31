import { useCallback, useMemo, useState } from "react";
import { decodeGridCenter } from "@/entities/cell";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useEventHeartbeat } from "@/features/event/model/use-event-heartbeat";
import { useEventRoomStore } from "@/features/event/model/event-room-store";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { useMissionSelectionStore } from "@/features/map-home/model/mission-selection-store";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import { useGridCardPlay } from "@/features/map-home/model/use-grid-card-play";
import { useHomeMissions } from "@/features/map-home/model/use-home-missions";
import { useHomeGridDetail } from "@/features/map-home/model/use-home-grid-detail";
import { buildMissionGridMembership } from "@/features/map-home/model/mission-overlay";
import { useHomeOverlays } from "@/features/map-home/model/use-home-overlays";
import { useHotRegionSummary } from "@/features/map-home/model/use-hot-region-summary";
import { useOccupiedGridsQuery } from "@/features/map-home/model/use-occupied-grids-query";
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { useRegionPanelStore } from "@/features/region/model/region-panel-store";
import { useReverseGeocodeQuery } from "@/features/region/model/use-reverse-geocode-query";
import { zoomForGridFocus } from "@/features/search/model/zone-search";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import { SITE_TITLE } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";
import { VideoMiniPanel } from "@/widgets/video-mini-panel/VideoMiniPanel";
import { CardPlayNotice } from "./ui/CardPlayNotice";
import { HomePanelSwitch } from "./ui/HomePanelSwitch";
import { HomeSearchBox } from "./ui/HomeSearchBox";
import { RegionReloadButton } from "./ui/RegionReloadButton";
import { useHomeChipEntry } from "./ui/use-home-chip-entry";
import { useHomeCloseHandlers } from "./ui/use-home-close-handlers";
import { useEventOverlayPublish } from "./ui/use-event-overlay-publish";
import { useHomeEntryLifecycle } from "./ui/use-home-entry-lifecycle";
import { useHomeOverlayPublish } from "./ui/use-home-overlay-publish";
import { useHomePanelState } from "./ui/use-home-panel-state";

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
  // 홈 탭 제목은 정적 셸(index.html)과 같은 SITE_TITLE — 직접 진입·복귀 모두 같은 값 (MSG-478 C3)
  useDocumentTitle(SITE_TITLE);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const activeTheme = useThemeFilterStore((s) => s.activeTheme);
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
  // 행사방 (MSG-516 AC 10) — 캡슐 세그먼트 선택이 열고, 뒤로가기·캡슐 ✕·테마 활성화가
  // 닫는다. 뒤로가기는 2단(MSG-518 AC 12) — useHomeCloseHandlers가 배선한다
  const eventRoom = useEventRoomStore((s) => s.room);

  // 내 점령 격자 id — 빗금 판정(테마 셀 ∩ 점령)과 셀 상세 열림 판정용.
  // 표시는 셸 상시 층(MSG-263 D9) 소유이고, 홈은 같은 뷰포트 쿼리를 구독만 한다(캐시 공유)
  const viewportBounds = useViewportStore((s) => s.bounds);
  const viewportCenter = useViewportStore((s) => s.center);
  const viewportZoom = useViewportStore((s) => s.zoom);
  // 지도 데이터의 bbox 정본은 **확정 영역**이다 (AC 12) — 지도를 미는 동안에는 갱신되지 않는다
  const committedRegion = useRegionPanelStore((s) => s.displayedRegion);
  const committedBounds = useRegionPanelStore((s) => s.committedBounds);
  const commitRegion = useRegionPanelStore((s) => s.commit);
  const { grids: occupiedGrids } = useOccupiedGridsQuery(committedBounds);
  const occupiedIds = useMemo(
    () => occupiedGrids.map((g) => g.gridId),
    [occupiedGrids],
  );

  // 현재 지도 중심 행정동 — "장소 불러오기" 버튼의 대상이자 칩 진입 확정 대상.
  // 화면 표시(헤더·핫구역 요약)는 확정 지역을 쓴다 (AC 13).
  // MSG-474: 역지오코딩이 익명 허용(MSG-467, 실측 2026-08-26)돼 비로그인 게이트를 걷어냈다
  const reverse = useReverseGeocodeQuery(viewportCenter);
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
    isPlaceholder: missionsPlaceholder,
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
    zoom: viewportZoom,
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

  // 격자 → 소속 미션 맵 (MSG-462 AC 6ⓑ) — 칩 활성 격자 탭의 FE 도형 폴백 판정 입력.
  // 오버레이 목록 파생과 같은 확정 영역으로 잘라 클릭 가능한 격자와 판정 집합을 맞춘다
  const gridMembership = useMemo(
    () =>
      committedBounds === null || eventChip === null
        ? new Map<string, number>()
        : buildMissionGridMembership(missionViews, committedBounds),
    [missionViews, committedBounds, eventChip],
  );

  // 게시 셀 파생·탭 판정·게시/해제 배선 (리뷰 반영 — 300줄 초과 분할)
  useHomeOverlayPublish({
    activeTheme,
    overlays,
    hotCells: hotSummary.cells,
    occupiedIds,
    playingGridId: cardPlay.playingGridId,
    searchGridId,
    eventChip,
    gridMembership,
    // 행사방 열림 중에는 행사 오버레이 게시 훅이 단독 게시자다 (MSG-517 AC 6)
    suspended: eventRoom !== null,
  });
  // 행사 위치 영역 채색·라벨·격자 클릭 강조 게시 — 열림 동안 유지, 닫으면 걷힘 (MSG-517 AC 6·7).
  // 단독 게시 보장은 두 guard의 상호 배타가 맡는다 — 홈 훅은 suspended(=방 열림)면, 이
  // 훅은 room === null이면 스토어를 건드리지 않아 한 커밋에 게시자는 항상 하나다.
  // 선언 순서는 안전 조건이 아니다 (React가 destroy 전부 → create 전부 순으로 실행)
  useEventOverlayPublish(eventRoom);
  // 열람 heartbeat (MSG-517 AC 5, 확정 2) — 행사방이 열려 있는 동안 30초 주기, 닫으면 중단
  useEventHeartbeat(eventRoom?.occurrenceId ?? null);

  // 상세 패널의 "전체 보기" — 상세를 닫고 패널 안 전체 지역 리스트를 연다 (MSG-328)
  const openRegionList = useRegionPanelStore((s) => s.openRegionList);
  const handleViewAll = useCallback(() => {
    closeDetail();
    openRegionList();
  }, [closeDetail, openRegionList]);

  // 칩 진입 — 줌+확정(MSG-403) 후 최근접 대상으로 이동+선택(MSG-451 AC 13)
  useHomeChipEntry({
    activeTheme,
    viewportBounds,
    viewportCenter,
    viewportZoom,
    currentRegion,
    missionViews,
    courseViews,
    isRouteChip,
    listPending: missionsPending,
    listPlaceholder: missionsPlaceholder,
    zoomTo,
    moveTo,
    commit: commitRegion,
  });

  useHomeEntryLifecycle();

  // 격자 상세 (MSG-325·326) — 쿼리 3종 + 맥락 줄 파생은 훅이 소유한다 (리뷰 반영: 페이지 분할).
  // MSG-474: 비로그인은 grids/{gridId} 미발사 — 핫구역 응답의 이름 재료로 조립한다
  const gridDetail = useHomeGridDetail({
    selectedGridId: selectedCellId,
    activeTheme,
    selectedCourse,
    collectedGrids,
    hotGridCount: hotSummary.hotGridIds.length,
    progressFailed,
    entryNamingSources: hotSummary.zones,
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

  // Escape·닫기 핸들러 — 미니 패널 우선순위 조합 (리뷰 반영 — 300줄 초과 분할)
  const { closeDetailMiniFirst, closeThemeMiniFirst, backEventRoomMiniFirst } =
    useHomeCloseHandlers(activeTheme);

  // 패널 분기 + "장소 불러오기" 대상 (리뷰 반영 — 300줄 초과 분할)
  const { panel, reloadTarget } = useHomePanelState({
    activeTheme,
    selectedMission,
    selectedCourse,
    selectedCellId,
    eventRoomOpen: eventRoom !== null,
    committedRegion,
    currentRegion,
    zoom: viewportZoom,
  });

  return (
    <>
      <aside className="pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-97 flex-col gap-sm bg-background p-md shadow-raised">
        <h1 className="sr-only">우리 동네를 영상으로 채워가는 지도</h1>
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
          eventRoom={eventRoom}
          onEventRoomBack={backEventRoomMiniFirst}
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
          // 비로그인 진행도 잠금 (MSG-463 AC 9) — use-home-panel-state는 수정 금지라 props 경로만 쓴다
          progressLocked={!isAuthenticated}
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
