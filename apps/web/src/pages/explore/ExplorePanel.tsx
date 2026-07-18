import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import type { Bounds, Cell, LatLng } from "@/entities/cell";
import {
  selectExploreCells,
  type SortOrder,
} from "@/features/explore/model/explore-cells";
import { useExploreFilterStore } from "@/features/explore/model/explore-filter-store";
import {
  filterCellsInBounds,
  summarizeCells,
} from "@/features/map-home/model/cell-viewport";
import { useCellsQuery } from "@/features/map-home/model/use-cells-query";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";
import { ExploreCellCard } from "./ui/ExploreCellCard";
import { SortChip } from "./ui/SortChip";

/** 뷰포트→행정구역명 변환은 범위 밖, 고정 목값 표시 */
const REGION_LABEL = "서울 마포구 격자";

interface ExploreNavState {
  /** 검색으로 진입 시 적용할 검색어 */
  searchQuery?: string;
  /** 지역 선택으로 진입 시 적용할 구 */
  searchRegion?: string;
}

/**
 * 탐색 패널(`/explore`) — 지속 셸(MapShell)이 렌더한 지도 위에 얹는 388px 오버레이.
 * 정렬 칩(인기순/최신순) + 뷰포트 요약 헤더 + 2열 카드 그리드로 결과를 보여준다.
 * 검색 입력은 SearchBox(드롭다운)가 담당하고, 이 패널은 진입 시 넘어온 필터를 반영해 조회만 한다.
 */
export const ExplorePanel = () => {
  const { moveTo } = useMapShell();
  const bounds = useViewportStore((s) => s.bounds);
  const { data, isLoading, isError, refetch } = useCellsQuery();

  const query = useExploreFilterStore((s) => s.query);
  const selectedRegion = useExploreFilterStore((s) => s.selectedRegion);
  const clearFilters = useExploreFilterStore((s) => s.clearFilters);
  const applySearch = useExploreFilterStore((s) => s.applySearch);
  const selectRegion = useExploreFilterStore((s) => s.selectRegion);
  const [order, setOrder] = useState<SortOrder>("popular");
  const location = useLocation();

  // 진입 시 필터 초기화 후, 검색/지역으로 넘어왔으면 그 필터만 적용한다.
  // (네비 아이콘·"전체 보기"로 진입하면 state가 없어 전체 조회) — 마운트 1회.
  useEffect(() => {
    clearFilters();
    const nav = location.state as ExploreNavState | null;
    if (nav?.searchQuery) applySearch(nav.searchQuery);
    else if (nav?.searchRegion) selectRegion(nav.searchRegion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <aside className="pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-97 flex-col bg-background shadow-raised">
      <div className="flex gap-xs p-md">
        <SortChip
          label="인기순"
          active={order === "popular"}
          onClick={() => setOrder("popular")}
        />
        <SortChip
          label="최신순"
          active={order === "recent"}
          onClick={() => setOrder("recent")}
        />
      </div>

      <ExploreBody
        bounds={bounds}
        cells={data ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        query={query}
        order={order}
        district={selectedRegion}
        onCellSelect={moveTo}
      />
    </aside>
  );
};

interface ExploreBodyProps {
  bounds: Bounds | null;
  cells: Cell[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  query: string;
  order: SortOrder;
  /** 선택된 지역 필터 — null이면 지역 필터 미적용 (MSG-114) */
  district: string | null;
  onCellSelect: (center: LatLng) => void;
}

/** 요약 헤더 + 카드 그리드 / 로딩 · 에러 · 빈 상태 분기 */
const ExploreBody = ({
  bounds,
  cells,
  isLoading,
  isError,
  onRetry,
  query,
  order,
  district,
  onCellSelect,
}: ExploreBodyProps) => {
  // early return(isError·isLoading) 아래에 두면 렌더마다 훅 호출 여부가 달라져
  // Rules of Hooks를 어기므로, 분기 위에서 무조건 호출하고 null 처리는 내부에서 한다.
  const visibleCells = useMemo(
    () => (bounds ? filterCellsInBounds(cells, bounds) : []),
    [cells, bounds],
  );
  const { cellCount } = useMemo(() => summarizeCells(visibleCells), [visibleCells]);
  const displayCells = useMemo(
    () => selectExploreCells(visibleCells, { query, order, district }),
    [visibleCells, query, order, district],
  );

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-sm px-md text-center">
        <p className="text-fm-body text-foreground-muted">
          정보를 불러오지 못했어요
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="text-fm-label text-primary"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (isLoading || !bounds) {
    return (
      <p className="px-md text-fm-body text-foreground-muted">
        이 지역 정보를 불러오는 중이에요…
      </p>
    );
  }

  return (
    <>
      <div className="flex items-baseline gap-xs px-md pb-sm">
        <span className="text-fm-title text-foreground">
          {query.trim()
            ? `'${query.trim()}' 검색 결과`
            : district
              ? `서울 ${district} 격자`
              : REGION_LABEL}
        </span>
        <span className="text-fm-body text-foreground-muted">{cellCount}개</span>
      </div>

      <div className="flex-1 overflow-y-auto px-md pb-md scrollbar-gutter-stable">
        {displayCells.length === 0 ? (
          <p className="pt-lg text-center text-fm-body text-foreground-muted">
            {query.trim()
              ? "검색 결과가 없어요. 다른 이름으로 검색해 보세요."
              : "이 지역에는 아직 격자가 없어요. 지도를 움직여 다른 지역을 둘러보세요."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-sm">
            {displayCells.map((cell) => (
              <ExploreCellCard
                key={cell.id}
                cell={cell}
                onSelect={onCellSelect}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};
