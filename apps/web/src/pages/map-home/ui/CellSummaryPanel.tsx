import { Play } from "lucide-react";
import { BottomSheet, Button } from "@fillmap/ui-web";
import type { Cell, LatLng } from "@/entities/cell";
import { formatDuration } from "@/features/explore/model/explore-cells";
import {
  filterCellsInBounds,
  summarizeCells,
  topCellsByVideo,
} from "@/features/map-home/model/cell-viewport";
import { useCellsQuery } from "@/features/map-home/model/use-cells-query";
import { useOccupiedGridsQuery } from "@/features/map-home/model/use-occupied-grids-query";
import { useViewportStore } from "@/features/map-home/model/viewport-store";

interface CellSummaryPanelProps {
  /** "전체 보기" 클릭 (탐색으로 이동) */
  onViewAll: () => void;
  /** 격자 카드 클릭 (지도를 해당 격자 중심으로 이동) */
  onCellSelect: (center: LatLng) => void;
}

/**
 * 격자 카드 — 168:110 비율 썸네일(중앙 재생 아이콘 + 우하단 재생시간 배지) + 라벨 + "N개 영상",
 * 클릭 시 지도 이동(S7 유지). 회색 썸네일은 placeholder가 정상 — 실제 이미지 연동은 제외 범위
 * (MSG-253 오탐 방지 1). durationSec이 없는 격자는 배지 미표시 (AC 3).
 */
const CellCard = ({
  cell,
  onSelect,
}: {
  cell: Cell;
  onSelect: (center: LatLng) => void;
}) => {
  const duration = formatDuration(cell.durationSec);
  return (
    <button
      type="button"
      onClick={() => onSelect(cell.center)}
      className="flex flex-col gap-xxs text-left transition-colors active:opacity-80"
    >
      <span className="relative flex aspect-[168/110] w-full items-center justify-center overflow-hidden rounded-sm bg-surface">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Play className="size-3 fill-current" />
        </span>
        {duration && (
          <span className="absolute bottom-xs right-xs rounded-xs bg-navy-900/70 px-1.5 py-0.5 text-fm-caption text-foreground-inverse">
            {duration}
          </span>
        )}
      </span>
      <span className="max-w-full truncate text-fm-body-strong text-foreground">
        {cell.label}
      </span>
      <span className="text-fm-caption text-foreground-muted">
        {cell.videoCount}개 영상
      </span>
    </button>
  );
};

/**
 * 지도 위 요약 패널 — 현재 뷰포트 기준 격자·영상 요약과 상위 격자 카드.
 * 로딩(S12)·에러(S13)·빈(S6)·정상(S4) 4상태를 처리한다.
 *
 * MSG-325 기준 15: 내 점령 격자 조회(`/api/grids`)의 로딩·실패도 이 패널의 기존 상태 슬롯이
 * 함께 표현한다 — "이 지역 정보"를 대표하는 자리가 여기라 별도 UI를 만들지 않는다.
 * 격자 카드 목록 자체(탐색·요약 소스)는 제외 범위로 목을 유지한다.
 */
export const CellSummaryPanel = ({
  onViewAll,
  onCellSelect,
}: CellSummaryPanelProps) => {
  const bounds = useViewportStore((s) => s.bounds);
  const cells = useCellsQuery();
  const occupied = useOccupiedGridsQuery(bounds);

  const { data } = cells;
  const isLoading = cells.isLoading || occupied.isLoading;
  const isError = cells.isError || occupied.isError;
  const refetch = () => {
    void cells.refetch();
    void occupied.refetch();
  };

  // 에러를 로딩보다 먼저 체크 — 지도 로드 실패로 bounds가 null에 머물러도 S13 에러 상태에 도달해야 한다
  if (isError) {
    return (
      <BottomSheet handle={false} className="rounded-lg">
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

  if (isLoading || !bounds) {
    return (
      <BottomSheet handle={false} className="rounded-lg">
        <p className="py-sm text-fm-body text-foreground-muted">
          이 지역 정보를 불러오는 중이에요…
        </p>
      </BottomSheet>
    );
  }

  const visibleCells = filterCellsInBounds(data ?? [], bounds);
  const { cellCount, videoCount } = summarizeCells(visibleCells);
  const topCells = topCellsByVideo(visibleCells);

  return (
    <BottomSheet
      handle={false}
      className="rounded-lg"
      title={`이 지역 격자 ${cellCount}개 · 영상 ${videoCount}개`}
      actionLabel="전체 보기"
      onAction={onViewAll}
    >
      {cellCount === 0 ? (
        <p className="py-xs text-fm-body text-foreground-muted">
          이 지역에는 아직 격자가 없어요. 지도를 움직여 다른 지역을 둘러보세요.
        </p>
      ) : (
        // 2열 세로 그리드 (AC 1) — 홀수 개면 마지막 행은 왼쪽 1개만 채워진다
        <div className="grid grid-cols-2 gap-sm">
          {topCells.map((cell) => (
            <CellCard key={cell.id} cell={cell} onSelect={onCellSelect} />
          ))}
        </div>
      )}
    </BottomSheet>
  );
};
