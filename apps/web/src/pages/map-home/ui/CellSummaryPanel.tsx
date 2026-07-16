import { Play } from "lucide-react";
import { BottomSheet, Button, CellBadge } from "@fillmap/ui-web";
import type { Cell, LatLng } from "@/entities/cell";
import {
  filterCellsInBounds,
  summarizeCells,
  topCellsByVideo,
} from "@/features/map-home/model/cell-viewport";
import { useCellsQuery } from "@/features/map-home/model/use-cells-query";
import { useViewportStore } from "@/features/map-home/model/viewport-store";

interface CellSummaryPanelProps {
  /** "전체 보기" 클릭 (탐색으로 이동) */
  onViewAll: () => void;
  /** 격자 카드 클릭 (지도를 해당 격자 중심으로 이동) */
  onCellSelect: (center: LatLng) => void;
}

/** 격자 카드 — 썸네일(재생 아이콘) + 라벨 + "N개 영상", 클릭 시 지도 이동(S7) */
const CellCard = ({
  cell,
  onSelect,
}: {
  cell: Cell;
  onSelect: (center: LatLng) => void;
}) => (
  <button
    type="button"
    onClick={() => onSelect(cell.center)}
    className="flex w-[104px] shrink-0 flex-col gap-xxs text-left transition-colors active:opacity-80"
  >
    <span className="flex h-[64px] w-full items-center justify-center rounded-sm bg-surface text-icon">
      <Play className="size-[20px]" />
    </span>
    <CellBadge label={cell.label} className="max-w-full truncate" />
    <span className="text-fm-caption text-foreground-muted">
      {cell.videoCount}개 영상
    </span>
  </button>
);

/**
 * 지도 위 요약 패널 — 현재 뷰포트 기준 격자·영상 요약과 상위 격자 카드.
 * 로딩(S12)·에러(S13)·빈(S6)·정상(S4) 4상태를 처리한다.
 */
export const CellSummaryPanel = ({
  onViewAll,
  onCellSelect,
}: CellSummaryPanelProps) => {
  const bounds = useViewportStore((s) => s.bounds);
  const { data, isLoading, isError, refetch } = useCellsQuery();

  if (isLoading || !bounds) {
    return (
      <BottomSheet className="rounded-xl">
        <p className="py-sm text-fm-body text-foreground-muted">
          이 지역 정보를 불러오는 중이에요…
        </p>
      </BottomSheet>
    );
  }

  if (isError) {
    return (
      <BottomSheet className="rounded-xl">
        <div className="flex items-center justify-between gap-sm py-xs">
          <p className="text-fm-body text-foreground-muted">
            정보를 불러오지 못했어요
          </p>
          <Button
            text="다시 시도"
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
          />
        </div>
      </BottomSheet>
    );
  }

  const visibleCells = filterCellsInBounds(data ?? [], bounds);
  const { cellCount, videoCount } = summarizeCells(visibleCells);
  const topCells = topCellsByVideo(visibleCells);

  return (
    <BottomSheet
      className="rounded-xl"
      title={`이 지역 격자 ${cellCount}개 · 영상 ${videoCount}개`}
      actionLabel="전체 보기"
      onAction={onViewAll}
    >
      {cellCount === 0 ? (
        <p className="py-xs text-fm-body text-foreground-muted">
          이 지역에는 아직 격자가 없어요. 지도를 움직여 다른 지역을 둘러보세요.
        </p>
      ) : (
        <div className="flex gap-sm overflow-x-auto">
          {topCells.map((cell) => (
            <CellCard key={cell.id} cell={cell} onSelect={onCellSelect} />
          ))}
        </div>
      )}
    </BottomSheet>
  );
};
