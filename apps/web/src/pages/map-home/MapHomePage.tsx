import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/app/routes";
import { useExploreFilterStore } from "@/features/explore/model/explore-filter-store";
import { SearchBox } from "@/features/explore/ui/SearchBox";
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
  const clearFilters = useExploreFilterStore((s) => s.clearFilters);

  return (
    <aside className="pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-97 flex-col gap-sm bg-background p-md shadow-raised">
      {/* 검색은 드롭다운으로 그 자리에서 — 확정 시 탐색 그리드로 이동해 결과 표시 */}
      <SearchBox />
      <CellSummaryPanel
        onViewAll={() => {
          // "전체 보기"는 브라우즈(전체 조회) — 이전 필터를 비우고 탐색으로 이동
          clearFilters();
          navigate(ROUTES.explore);
        }}
        onCellSelect={moveTo}
      />
    </aside>
  );
};
