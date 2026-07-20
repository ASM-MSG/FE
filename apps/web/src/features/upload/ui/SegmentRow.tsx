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
 * 선택 버튼과 재생 버튼을 형제 요소로 배치해 인터랙티브 요소 중첩(버튼 안에 버튼)을 피한다 — AT가
 * 중복 안내하거나 포커스 순서가 어색해지는 것을 방지.
 */
export const SegmentRow = ({
  suggestion,
  selected,
  onSelect,
  onPlay,
}: SegmentRowProps) => (
  <div
    className={cn(
      "flex w-full items-center gap-sm rounded-md border p-xs transition-colors",
      selected
        ? "border-primary bg-primary/5"
        : "border-border bg-surface-soft hover:border-primary/40",
    )}
  >
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="flex min-w-0 flex-1 cursor-pointer items-center gap-sm text-left"
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
    </button>

    <button
      type="button"
      aria-label="구간 재생"
      onClick={onPlay}
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-[filter] active:brightness-[0.86]"
    >
      <Play className="size-4" />
    </button>
  </div>
);
