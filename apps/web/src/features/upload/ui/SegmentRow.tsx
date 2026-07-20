import { Film, Play } from "lucide-react";
import { cn } from "@fillmap/ui-web";
import {
  formatTimecode,
  type HighlightSuggestion,
} from "@/features/upload/model/highlight-selection";

interface SegmentRowProps {
  suggestion: HighlightSuggestion;
  /** 선택 강조 여부 */
  selected: boolean;
  /** 항목 선택 */
  onSelect: () => void;
  /** 구간 재생(선택과 무관) */
  onPlay: () => void;
}

/**
 * AI 추천 구간 1개 — 썸네일 placeholder + 시작 시각 + 사유 + 재생 버튼. [S4·S5·S6]
 * 선택 시 primary 테두리 + 옅은 primary 배경으로 강조(추정 4). 재생은 선택을 바꾸지 않는다(추정 3).
 */
export const SegmentRow = ({
  suggestion,
  selected,
  onSelect,
  onPlay,
}: SegmentRowProps) => (
  <div
    role="button"
    tabIndex={0}
    aria-pressed={selected}
    onClick={onSelect}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect();
      }
    }}
    className={cn(
      "flex w-full cursor-pointer items-center gap-sm rounded-md border p-xs text-left transition-colors",
      selected
        ? "border-primary bg-primary/5"
        : "border-border bg-surface-soft hover:border-primary/40",
    )}
  >
    <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted text-foreground-muted">
      <Film className="size-4" />
    </span>

    <span className="flex min-w-0 flex-1 flex-col gap-xxs">
      <span className="text-fm-body-strong text-foreground">
        {formatTimecode(suggestion.start)} – {formatTimecode(suggestion.end)}
      </span>
      <span className="truncate text-fm-label text-foreground-muted">
        {suggestion.reason}
      </span>
    </span>

    <button
      type="button"
      aria-label="구간 재생"
      onClick={(event) => {
        event.stopPropagation();
        onPlay();
      }}
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-[filter] active:brightness-[0.86]"
    >
      <Play className="size-4" />
    </button>
  </div>
);
