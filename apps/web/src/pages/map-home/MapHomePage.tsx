import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchBar } from "@fillmap/ui-web";
import { ROUTES } from "@/app/routes";
import type { LatLng } from "@/entities/cell";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { SEOUL_CITY_HALL, getCurrentPosition } from "@/shared/geolocation";
import { MapCanvas, type MapCanvasHandle } from "./ui/MapCanvas";
import { CellSummaryPanel } from "./ui/CellSummaryPanel";
import { MapControls } from "./ui/MapControls";

/**
 * 지도 홈 페이지(`/`) — 카카오맵 배경 + 검색바·요약 패널·우하단 컨트롤 조립(얇은 뷰).
 * 상태·데이터 로직은 features/entities로 내리고, 여기서는 배치와 콜백 연결만 담당한다.
 */
export const MapHomePage = () => {
  const navigate = useNavigate();
  const setViewport = useViewportStore((s) => s.setViewport);
  const mapRef = useRef<MapCanvasHandle>(null);
  const [initialCenter, setInitialCenter] = useState<LatLng>(SEOUL_CITY_HALL);

  // 진입 시 현재 위치로 초기 중심 설정 (권한 거부/실패 시 서울 시청 폴백, S2)
  useEffect(() => {
    let active = true;
    getCurrentPosition().then((coords) => {
      if (active) setInitialCenter(coords);
    });
    return () => {
      active = false;
    };
  }, []);

  // 현재 위치 재이동 (폴백 일관성 — L6 어댑터 재사용, S9)
  const handleLocate = () => {
    getCurrentPosition().then((coords) => mapRef.current?.moveTo(coords));
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <MapCanvas
          ref={mapRef}
          center={initialCenter}
          onViewportChange={setViewport}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="pointer-events-auto absolute left-md top-md flex w-[360px] flex-col gap-sm">
          <SearchBar placeholder="장소, 격자, 영상 검색" />
          <CellSummaryPanel
            onViewAll={() => navigate(ROUTES.explore)}
            onCellSelect={(center) => mapRef.current?.moveTo(center)}
          />
        </div>

        <div className="pointer-events-auto absolute bottom-md right-md">
          <MapControls
            onUpload={() => navigate(ROUTES.upload)}
            onLocate={handleLocate}
            onZoomIn={() => mapRef.current?.zoomIn()}
            onZoomOut={() => mapRef.current?.zoomOut()}
          />
        </div>
      </div>
    </div>
  );
};
