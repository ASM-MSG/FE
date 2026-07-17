import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import type { LatLng } from "@/entities/cell";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { MapCanvas, type MapCanvasHandle } from "@/pages/map-home/ui/MapCanvas";
import { SEOUL_CITY_HALL, getCurrentPosition } from "@/shared/geolocation";
import type { MapShellContext } from "./use-map-shell";

/**
 * 지속 지도 셸 — 홈(`/`)과 탐색(`/explore`)이 이 셸을 공유하므로 지도 인스턴스와
 * 뷰포트 상태가 라우트 전환에도 유지된다(D1). 경로별 오버레이는 Outlet으로 스위칭한다.
 * 지도 SDK import는 MapCanvas 경계 안에만 두고, 셸은 배치와 명령 주입만 담당한다.
 */
export const MapShell = () => {
  const setViewport = useViewportStore((s) => s.setViewport);
  const mapRef = useRef<MapCanvasHandle>(null);
  const [initialCenter, setInitialCenter] = useState<LatLng>(SEOUL_CITY_HALL);

  // 진입 시 현재 위치로 초기 중심 설정 (권한 거부/실패 시 서울 시청 폴백)
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
        />
      </div>

      <Outlet context={context} />
    </div>
  );
};
