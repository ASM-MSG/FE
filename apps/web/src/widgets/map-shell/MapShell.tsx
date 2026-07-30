import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import type { LatLng } from "@/entities/cell";
import { useMapOverlayStore } from "./map-overlay-store";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { MapCanvas, type MapCanvasHandle } from "@/pages/map-home/ui/MapCanvas";
import { MapControls } from "@/pages/map-home/ui/MapControls";
import { SEOMYEON_CENTER, getCurrentPosition } from "@/shared/geolocation";
import { SidebarCollapseHandle } from "./SidebarCollapseHandle";
import { useSidebarStore } from "./sidebar-store";
import type { MapShellContext } from "./use-map-shell";

/**
 * 지속 지도 셸 — 홈(`/`)과 탐색(`/explore`)이 이 셸을 공유하므로 지도 인스턴스와
 * 뷰포트 상태가 라우트 전환에도 유지된다(D1). 경로별 오버레이는 Outlet으로 스위칭한다.
 * 지도 SDK import는 MapCanvas 경계 안에만 두고, 셸은 배치와 명령 주입만 담당한다.
 */
export const MapShell = () => {
  const setViewport = useViewportStore((s) => s.setViewport);
  // 축척 표시값 — MapCanvas가 이동/줌 이벤트마다 setViewport로 밀어 넣는 값을 구독.
  // bounds는 "지도 준비 전에는 null"(스토어 계약) — 준비 전·로드 실패 폴백에서는 축척을 숨긴다
  const zoomLevel = useViewportStore((s) => (s.bounds ? s.zoom : null));
  const collapsed = useSidebarStore((s) => s.collapsed);
  const openUploadModal = useUploadModalStore((s) => s.openModal);
  // 셀 오버레이(MSG-121) — 게시자 패널(도감·홈)이 게시/해제하고 셸은 지도에 중계만 한다. 빈 목록이면 기존 동작 동일(R3)
  const overlayCells = useMapOverlayStore((s) => s.cells);
  // 경로 오버레이(MSG-252 AC 8) — 홈이 경로추천 활성 시에만 게시, null이면 미표시
  const routeOverlay = useMapOverlayStore((s) => s.route);
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
          overlayCells={overlayCells}
          route={routeOverlay ?? undefined}
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
