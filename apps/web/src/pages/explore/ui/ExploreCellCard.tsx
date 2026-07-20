import { Play } from "lucide-react";
import { cn } from "@fillmap/ui-web";
import type { Cell, LatLng } from "@/entities/cell";
import { formatDuration } from "@/features/explore/model/explore-cells";

interface ExploreCellCardProps {
  cell: Cell;
  /** 카드 클릭 시 지도를 해당 격자 중심으로 이동(S7) — 유지 */
  onSelect: (center: LatLng) => void;
  /** 카드 클릭 시 상세 시트를 연다(MSG-115) */
  onDetailSelect: (cell: Cell) => void;
  /** 상세가 열린 격자인지 — 선택 강조 (AC 7 시각 확인 보조) */
  selected?: boolean;
}

/**
 * 탐색 격자 카드 — 썸네일(공용 placeholder)+재생 아이콘 오버레이+영상 길이 배지,
 * 동네명+코드(S5), "N개 영상"을 표시한다. durationSec이 없으면 배지 미표시(S6).
 * 클릭 시 지도 이동(S7)과 상세 시트 열기(MSG-115)를 함께 트리거한다.
 * videoCount === 0인 격자는 비활성(disabled·흐림) 처리되어 클릭되지 않는다(AC 3).
 * 2열 그리드 셀로 배치되며 너비는 부모 그리드가 결정한다.
 */
export const ExploreCellCard = ({
  cell,
  onSelect,
  onDetailSelect,
  selected,
}: ExploreCellCardProps) => {
  const duration = formatDuration(cell.durationSec);
  const disabled = cell.videoCount === 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onSelect(cell.center);
        onDetailSelect(cell);
      }}
      className={cn(
        "flex w-full flex-col gap-xs rounded-sm text-left transition-opacity active:opacity-80",
        disabled && "pointer-events-none opacity-40",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
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
      <span
        title={cell.label}
        className="max-w-full truncate text-fm-body-strong text-foreground"
      >
        {cell.label}
      </span>
      <span className="text-fm-caption text-foreground-muted">
        {cell.videoCount}개 영상
      </span>
    </button>
  );
};
