import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import type { LatLng } from "@/entities/cell";
import { useMapOverlayStore } from "./map-overlay-store";
import {
  buildClusterMarkers,
  gateFillCells,
  selectClusterSource,
} from "@/features/map-home/model/cluster-overlay";
import {
  buildGridLines,
  excludeSectionCells,
} from "@/features/map-home/model/grid-overlay";
import { toOccupiedOverlays } from "@/features/map-home/model/occupied-grid-overlay";
import { useOccupiedGridsQuery } from "@/features/map-home/model/use-occupied-grids-query";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { MapCanvas, type MapCanvasHandle } from "@/pages/map-home/ui/MapCanvas";
import { MapControls } from "@/pages/map-home/ui/MapControls";
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
  // 경로 오버레이(MSG-252 AC 8) — 홈이 경로추천 활성 시에만 게시, null이면 미표시
  const routeOverlay = useMapOverlayStore((s) => s.route);

  // 상시 격자선 파생(MSG-263 D9) — MapCanvas가 idle마다 push하는 뷰포트를 직접 구독해
  // 뷰포트∩부산 경계·한 화면 버퍼·줌 게이트(GRID_MIN_ZOOM 미만 숨김, D4)로 재계산 (AC 9·13·16)
  const viewportBounds = useViewportStore((s) => s.bounds);
  const viewportZoom = useViewportStore((s) => s.zoom);
  const gridLines = useMemo(
    () => (viewportBounds ? buildGridLines(viewportBounds, viewportZoom) : []),
    [viewportBounds, viewportZoom],
  );

  // 상시 점령 셀 (MSG-263 D3·D9 → MSG-325 실 API) — 뷰포트 기준 내 점령 격자를 조회해
  // 그대로 오버레이로 쓴다. 이동 중에는 keepPreviousData가 직전 목록을 유지한다
  const { grids: occupiedGrids } = useOccupiedGridsQuery(viewportBounds);
  const persistentOccupiedCells = useMemo(
    () => toOccupiedOverlays(occupiedGrids),
    [occupiedGrids],
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
  // 클러스터 파생 (MSG-264 AC 4·9): 섹션 게시 셀이 있으면 그 셀(테마 색), 없으면 상시
  // 점령 셀(primary) 기준으로 집계 — zoom ≥ GRID_MIN_ZOOM이면 빈 배열(게이트 내장)
  const clusters = useMemo(
    () =>
      buildClusterMarkers(
        selectClusterSource(sectionCells, persistentOccupiedCells).cells,
        viewportZoom,
      ),
    [sectionCells, persistentOccupiedCells, viewportZoom],
  );
  // 오버레이 셀 클릭(MSG-122 AC 14·18) — 핸들러도 스토어 중계, null이면 표시 전용 기존 동작(R3)
  const onOverlayCellClick = useMapOverlayStore((s) => s.onCellClick);
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
          route={routeOverlay ?? undefined}
          clusters={clusters}
          onOverlayCellClick={onOverlayCellClick ?? undefined}
        />
      </div>

      {/* 접힘 시 패널을 숨기되(display:none) 언마운트하지 않아 검색·필터 상태가 유지된다 */}
      <div className={collapsed ? "hidden" : "contents"}>
        <Outlet context={context} />
      </div>

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
