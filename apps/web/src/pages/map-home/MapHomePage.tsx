import { useNavigate } from "react-router-dom";
import { SearchBar } from "@fillmap/ui-web";
import { ROUTES } from "@/app/routes";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";
import { CellSummaryPanel } from "./ui/CellSummaryPanel";
import { MapControls } from "./ui/MapControls";

/**
 * 지도 홈 오버레이(`/`) — 지속 셸(MapShell)이 렌더한 지도 위에 얹는 홈 전용 오버레이.
 * 검색바·요약 패널·우하단 컨트롤 조립(얇은 뷰). 지도 명령은 셸 API(useMapShell)로 받는다.
 */
export const MapHomePage = () => {
  const navigate = useNavigate();
  const { moveTo, zoomIn, zoomOut, locate } = useMapShell();

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="pointer-events-auto absolute left-md top-md flex w-[360px] flex-col gap-sm">
        {/* 홈 검색바는 탐색 검색 패널로 가는 트리거 — 입력은 검색 패널에서 */}
        <SearchBar
          placeholder="장소, 격자, 영상 검색"
          readOnly
          onClick={() => navigate(ROUTES.explore, { state: { openSearch: true } })}
          onFocus={() => navigate(ROUTES.explore, { state: { openSearch: true } })}
        />
        <CellSummaryPanel
          onViewAll={() => navigate(ROUTES.explore)}
          onCellSelect={moveTo}
        />
      </div>

      <div className="pointer-events-auto absolute bottom-md right-md">
        <MapControls
          onUpload={() => navigate(ROUTES.upload)}
          onLocate={locate}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
        />
      </div>
    </div>
  );
};
