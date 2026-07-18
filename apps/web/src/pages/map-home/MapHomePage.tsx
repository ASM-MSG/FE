import { useNavigate } from "react-router-dom";
import { SearchBar } from "@fillmap/ui-web";
import { ROUTES } from "@/app/routes";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";
import { CellSummaryPanel } from "./ui/CellSummaryPanel";

/**
 * 홈 패널(`/`) — 지속 셸(MapShell)이 렌더한 지도 위에 얹는 388px 좌측 사이드바.
 * 검색바(탐색 검색으로 가는 트리거) + 현재 뷰포트 요약(CellSummaryPanel)으로 구성된다.
 * 다른 섹션과 동일하게 셸의 접기 핸들로 접어 지도를 넓게 볼 수 있다. 지도 컨트롤은 셸이 소유한다.
 */
export const MapHomePage = () => {
  const navigate = useNavigate();
  const { moveTo } = useMapShell();

  return (
    <aside className="pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-97 flex-col gap-sm bg-background p-md shadow-raised">
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
    </aside>
  );
};
