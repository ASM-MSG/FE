import { useMemo, useState } from "react";
import { cn } from "@fillmap/ui-web";
import type { Bounds, Cell, LatLng } from "@/entities/cell";
import { useCellDetailStore } from "@/features/explore/model/cell-detail-store";
import {
  selectExploreCells,
  type SortOrder,
} from "@/features/explore/model/explore-cells";
import { useExploreFilterStore } from "@/features/explore/model/explore-filter-store";
import { SearchBox } from "@/features/explore/ui/SearchBox";
import {
  filterCellsInBounds,
  summarizeCells,
} from "@/features/map-home/model/cell-viewport";
import { useCellsQuery } from "@/features/map-home/model/use-cells-query";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { CellDetailSheet } from "@/widgets/cell-detail/CellDetailSheet";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";
import { ExploreCellCard } from "./ui/ExploreCellCard";
import { SortChip } from "./ui/SortChip";

/** 뷰포트→행정구역명 변환은 범위 밖, 고정 목값 표시 */
const REGION_LABEL = "부산 부산진구 격자";

/**
 * 탐색 패널(`/explore`) — 지속 셸(MapShell)이 렌더한 지도 위에 얹는 388px 오버레이.
 * 홈과 동일한 검색 박스(드롭다운) + 정렬 칩(인기순/최신순) + 요약 헤더 + 2열 카드 그리드.
 * 검색/지역 필터는 SearchBox가 스토어에 적용하고, 이 패널은 스토어를 반영해 조회한다.
 */
export const ExplorePanel = () => {
  const { moveTo } = useMapShell();
  const bounds = useViewportStore((s) => s.bounds);
  const { data, isLoading, isError, refetch } = useCellsQuery();

  const query = useExploreFilterStore((s) => s.query);
  const selectedRegion = useExploreFilterStore((s) => s.selectedRegion);
  const [order, setOrder] = useState<SortOrder>("popular");

  const selectedCellId = useCellDetailStore((s) => s.selectedCellId);
  const select = useCellDetailStore((s) => s.select);
  // 선택 격자는 필터 적용 전 전체 데이터에서 찾는다 — 필터가 선택 격자를 걸러도 시트는 유지(AC 8·9).
  const selectedCell = (data ?? []).find((c) => c.id === selectedCellId);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-y-0 left-0 z-10 flex",
        selectedCell && "right-0",
      )}
    >
      <aside className="flex w-97 shrink-0 flex-col bg-background shadow-raised">
        <div className="flex flex-col gap-sm p-md">
          <SearchBox />
          <div className="flex gap-xs">
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
          selectedCellId={selectedCellId}
          onCellSelect={moveTo}
          onCellDetailSelect={select}
        />
      </aside>

      {selectedCell && (
        <CellDetailSheet cell={selectedCell} className="min-w-0 flex-1" />
      )}
    </div>
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
  /** 상세가 열린 격자 id — 카드 선택 강조 (MSG-115) */
  selectedCellId: string | null;
  onCellSelect: (center: LatLng) => void;
  onCellDetailSelect: (cell: Cell) => void;
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
  selectedCellId,
  onCellSelect,
  onCellDetailSelect,
}: ExploreBodyProps) => {
  // early return(isError·isLoading) 아래에 두면 렌더마다 훅 호출 여부가 달라져
  // Rules of Hooks를 어기므로, 분기 위에서 무조건 호출하고 null 처리는 내부에서 한다.
  const visibleCells = useMemo(
    () => (bounds ? filterCellsInBounds(cells, bounds) : []),
    [cells, bounds],
  );
  const displayCells = useMemo(
    () => selectExploreCells(visibleCells, { query, order, district }),
    [visibleCells, query, order, district],
  );
  // 헤더 개수는 실제 렌더되는 목록(필터 적용 후) 기준 — 라벨과 개수가 어긋나지 않게
  const { cellCount } = useMemo(
    () => summarizeCells(displayCells),
    [displayCells],
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
              ? `부산 ${district} 격자`
              : REGION_LABEL}
        </span>
        <span className="text-fm-body text-foreground-muted">
          {cellCount}개
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-md pt-xs pb-md scrollbar-gutter-stable">
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
                selected={cell.id === selectedCellId}
                onSelect={onCellSelect}
                onDetailSelect={onCellDetailSelect}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};
