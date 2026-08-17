import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "@/app/routes";
import type { LatLng } from "@/entities/cell";
import { buildCellClickHandler } from "./grid-click-routing";
import { useMapOverlayStore } from "./map-overlay-store";
import { gateFillCells } from "@/features/map-home/model/cluster-overlay";
import {
  mergeOverlappingMarkers,
  toRegionClusterMarkers,
} from "@/features/map-home/model/region-cluster-overlay";
import { useGridAggregationQuery } from "@/features/map-home/model/use-grid-aggregation-query";
import {
  buildGridLines,
  excludeSectionCells,
} from "@/features/map-home/model/grid-overlay";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { visibleOccupiedCells } from "@/features/map-home/model/occupancy-visibility";
import { toOccupiedOverlays } from "@/features/map-home/model/occupied-grid-overlay";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import { useOccupiedGridsQuery } from "@/features/map-home/model/use-occupied-grids-query";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { useRegionPanelStore } from "@/features/region/model/region-panel-store";
import { useCommittedRegionBootstrap } from "@/features/region/model/use-committed-region";
import { MapCanvas, type MapCanvasHandle } from "@/pages/map-home/ui/MapCanvas";
import { MapControls } from "@/pages/map-home/ui/MapControls";
import { ThemeChipsBar } from "@/pages/map-home/ui/ThemeChipsBar";
import { SEOMYEON_CENTER, getCurrentPosition } from "@/shared/geolocation";
import { SidebarCollapseHandle } from "./SidebarCollapseHandle";
import { useSidebarStore } from "./sidebar-store";
import type { MapShellContext } from "./use-map-shell";

/**
 * 지속 지도 셸 — siderail 전 섹션이 이 셸을 공유하므로 지도 인스턴스와
 * 뷰포트 상태가 라우트 전환에도 유지된다(D1). 경로별 오버레이는 Outlet으로 스위칭한다.
 * 지도 SDK import는 MapCanvas 경계 안에만 두고, 셸은 배치와 명령 주입만 담당한다.
 * 격자선·점령 셀(MSG-263 D9)은 셸이 직접 파생·렌더하는 상시 층이다 — 섹션 게시 스토어를
 * 거치지 않아 섹션 전환·clear()와 무관하게 전 섹션에서 유지된다 (AC 16·18).
 */
export const MapShell = () => {
  const setViewport = useViewportStore((s) => s.setViewport);
  // 축척 표시값 — MapCanvas가 이동/줌 이벤트마다 setViewport로 밀어 넣는 값을 구독.
  // bounds는 "지도 준비 전에는 null"(스토어 계약) — 준비 전·로드 실패 폴백에서는 축척을 숨긴다
  const zoomLevel = useViewportStore((s) => (s.bounds ? s.zoom : null));
  const collapsed = useSidebarStore((s) => s.collapsed);
  const openUploadModal = useUploadModalStore((s) => s.openModal);
  // 섹션 게시 셀(MSG-121·252) — 게시자 패널(홈 테마 셀)이 게시/해제하고 셸은 중계만 한다
  const sectionCells = useMapOverlayStore((s) => s.cells);
  // 경로 오버레이(MSG-252 AC 8 → MSG-395 다중화) — 홈이 경로추천 활성 시에만 게시
  const routeOverlays = useMapOverlayStore((s) => s.routes);
  // 미션·코스 이름표(MSG-395 AC 16·18·21) — 호버·선택·코스 목록에서 게시
  const labelOverlays = useMapOverlayStore((s) => s.labels);

  // 상시 격자선 파생(MSG-263 D9) — MapCanvas가 idle마다 push하는 뷰포트를 직접 구독해
  // 뷰포트∩부산 경계·한 화면 버퍼·줌 게이트(GRID_MIN_ZOOM 미만 숨김, D4)로 재계산 (AC 9·13·16)
  const viewportBounds = useViewportStore((s) => s.bounds);
  const viewportZoom = useViewportStore((s) => s.zoom);
  const gridLines = useMemo(
    () => (viewportBounds ? buildGridLines(viewportBounds, viewportZoom) : []),
    [viewportBounds, viewportZoom],
  );

  // 상시 점령 셀 (MSG-263 D3·D9 → MSG-325 실 API → MSG-403 확정 영역) — 조회 bbox는
  // 뷰포트가 아니라 **확정 영역**이다(AC 12): 뷰포트를 쓰면 지도를 미는 동안 요청이
  // 계속 나가고 격자가 매번 다시 그려진다
  const committedBounds = useRegionPanelStore((s) => s.committedBounds);
  const { grids: occupiedGrids } = useOccupiedGridsQuery(committedBounds);
  // 칩이 켜져 있으면 점령 층을 통째로 비운다 — 칩 화면에는 그 칩의 대상만 남는다 (AC 1)
  const activeTheme = useThemeFilterStore((s) => s.activeTheme);
  const persistentOccupiedCells = useMemo(
    () => visibleOccupiedCells(toOccupiedOverlays(occupiedGrids), activeTheme),
    [occupiedGrids, activeTheme],
  );

  // 상시 점령 셀 + 섹션 게시 셀 병합 — 게시 셀과 id가 겹치는 상시 셀은 제외해
  // 교집합을 섹션(테마) 스타일로 1회만 그린다 (MSG-263 개정 2 AC 8, R6)
  const overlayCells = useMemo(
    () => [
      ...excludeSectionCells(persistentOccupiedCells, sectionCells),
      ...sectionCells,
    ],
    [persistentOccupiedCells, sectionCells],
  );
  // 채움 줌 게이트 (MSG-264 AC 1·2, A5 — 전 섹션 공유): zoom < GRID_MIN_ZOOM이면
  // 채움 셀을 전달하지 않고 아래 클러스터로 전환한다 — MSG-263 D4(채움 상시 표시) 대체
  const visibleOverlayCells = useMemo(
    () => gateFillCells(overlayCells, viewportZoom),
    [overlayCells, viewportZoom],
  );
  // 저줌 지역 집계 마커 (MSG-410 AC 2·4·5) — FE 로컬 클러스터 산술을 서버 집계로 대체.
  // 조회 bbox는 **뷰포트**(idle 갱신)다 — MSG-403 확정 영역 정본의 명시적 예외(추정 1,
  // 사용자 승인): 4km~ 줌에는 "장소 불러오기"가 없어 확정 영역으로는 갱신 수단이 없다.
  // 게이트(로그인·저줌·칩 없음)는 훅이 판정한다 — 칩 활성 중에는 items가 비어 마커도 없다 (AC 9)
  const { items: aggregationItems, unit: aggregationUnit } =
    useGridAggregationQuery(viewportBounds, viewportZoom);
  const clusters = useMemo(
    () =>
      aggregationUnit !== null
        ? mergeOverlappingMarkers(
            toRegionClusterMarkers(aggregationItems, aggregationUnit),
            viewportZoom,
          )
        : [],
    [aggregationItems, aggregationUnit, viewportZoom],
  );
  // 오버레이 셀 클릭(MSG-122 AC 14·18) — 핸들러도 스토어 중계, null이면 표시 전용 기존 동작(R3)
  const onOverlayCellClick = useMapOverlayStore((s) => s.onCellClick);

  // 점령 격자 클릭 우선 라우팅 (MSG-329 후속) — 어느 탭·어떤 선택 상태에서든 점령 격자
  // 클릭은 격자 상세가 우선한다. select()가 미니 패널까지 체인으로 닫아 이전 선택을
  // 초기화하고, 탐색·도감·프로필에서는 홈으로 전환해 상세를 보여준다
  const navigate = useNavigate();
  const selectCell = useHomeCellDetailStore((s) => s.select);
  const expandSidebar = useSidebarStore((s) => s.setCollapsed);
  const occupiedIds = useMemo(
    () => occupiedGrids.map((grid) => grid.gridId),
    [occupiedGrids],
  );
  const openGridDetail = useCallback(
    (cellId: string) => {
      selectCell(cellId);
      expandSidebar(false);
      navigate(ROUTES.home);
    },
    [selectCell, expandSidebar, navigate],
  );
  const handleCellClick = useMemo(
    () =>
      buildCellClickHandler({
        occupiedIds,
        openGridDetail,
        sectionHandler: onOverlayCellClick,
      }),
    [occupiedIds, openGridDetail, onOverlayCellClick],
  );
  // 확정 지역·영역 최초 채택 — 지도 데이터 조회 전체의 bbox 근원 (AC 9)
  useCommittedRegionBootstrap();

  // 칩 바는 홈에서만 뜨지만 **접힘 래퍼 밖**이다 (AC 14) — 패널을 접어도 칩은 지도 위에
  // 남아야 한다. 접힘 래퍼(hidden) 안의 MapHomePage가 그리던 것을 셸로 올렸다
  const { pathname } = useLocation();
  const isHome = pathname === ROUTES.home;

  const mapRef = useRef<MapCanvasHandle>(null);
  const [initialCenter, setInitialCenter] = useState<LatLng>(SEOMYEON_CENTER);

  // 진입 시 현재 위치로 초기 중심 설정 (권한 거부/실패 시 서면 폴백)
  useEffect(() => {
    let active = true;
    getCurrentPosition().then((coords) => {
      if (active) setInitialCenter(coords);
    });
    return () => {
      active = false;
    };
  }, []);

  const context = useMemo<MapShellContext>(
    () => ({
      moveTo: (coords) => mapRef.current?.moveTo(coords),
      zoomIn: () => mapRef.current?.zoomIn(),
      zoomOut: () => mapRef.current?.zoomOut(),
      zoomTo: (zoom) => mapRef.current?.zoomTo(zoom),
      fitBounds: (bounds) => mapRef.current?.fitBounds(bounds),
      locate: () => {
        getCurrentPosition().then((coords) => mapRef.current?.moveTo(coords));
      },
    }),
    [],
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <MapCanvas
          ref={mapRef}
          center={initialCenter}
          onViewportChange={setViewport}
          overlayCells={visibleOverlayCells}
          gridLines={gridLines}
          routes={routeOverlays}
          labels={labelOverlays}
          clusters={clusters}
          onOverlayCellClick={handleCellClick}
        />
      </div>

      {/* 접힘 시 패널을 숨기되(display:none) 언마운트하지 않아 검색·필터 상태가 유지된다 */}
      <div className={collapsed ? "hidden" : "contents"}>
        <Outlet context={context} />
      </div>

      {isHome && <ThemeChipsBar />}

      <SidebarCollapseHandle />

      {/* 지도 컨트롤은 어떤 섹션에서도 항상 지도 위에 유지된다 */}
      <div className="pointer-events-none absolute bottom-md right-md z-20">
        <div className="pointer-events-auto">
          <MapControls
            onUpload={openUploadModal}
            onLocate={context.locate}
            onZoomIn={context.zoomIn}
            onZoomOut={context.zoomOut}
            zoomLevel={zoomLevel}
          />
        </div>
      </div>
    </div>
  );
};
