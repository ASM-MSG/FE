import { Play } from "lucide-react";
import type { Cell, LatLng } from "@/entities/cell";
import { formatDuration } from "@/features/explore/model/explore-cells";

interface ExploreCellCardProps {
  cell: Cell;
  /** 카드 클릭 시 지도를 해당 격자 중심으로 이동(S7) */
  onSelect: (center: LatLng) => void;
}

/**
 * 탐색 격자 카드 — 썸네일(공용 placeholder)+재생 아이콘 오버레이+영상 길이 배지,
 * 동네명+코드(S5), "N개 영상"을 표시한다. durationSec이 없으면 배지 미표시(S6).
 * 2열 그리드 셀로 배치되며 너비는 부모 그리드가 결정한다.
 */
export const ExploreCellCard = ({ cell, onSelect }: ExploreCellCardProps) => {
  const duration = formatDuration(cell.durationSec);

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.center)}
      className="flex w-full flex-col gap-xs text-left transition-opacity active:opacity-80"
    >
      <span className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-sm bg-surface">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Play className="size-3.5 fill-current" />
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
