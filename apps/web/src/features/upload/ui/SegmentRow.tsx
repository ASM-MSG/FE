import { Film, Play } from "lucide-react";
import { cn } from "@fillmap/ui-web";
import {
  formatSegmentLabel,
  type HighlightSuggestion,
} from "@/features/upload/model/highlight-selection";

interface SegmentRowProps {
  suggestion: HighlightSuggestion;
  /** 선택 강조 여부 */
  selected: boolean;
  /** 카드 선택 — 선택 시 해당 구간이 미리 재생된다 (B7) */
  onSelect: () => void;
}

/**
 * AI 추천 구간 카드 1개 (MSG-329 B6·B7) — 썸네일 placeholder + 시간 정보 중심 라벨.
 * 서버 응답은 시간쌍뿐이라 사유 라벨은 없다(Figma "움직임·밝기 지속" 등은 플레이스홀더 —
 * 티켓 13 확정, 오탐 방지 1). 카드 클릭 = 선택 + 구간 미리 재생.
 */
export const SegmentRow = ({
  suggestion,
  selected,
  onSelect,
}: SegmentRowProps) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onSelect}
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

    <span className="min-w-0 flex-1 truncate text-fm-body-strong text-foreground">
      {formatSegmentLabel(suggestion)}
    </span>

    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
    >
      <Play className="size-4" />
    </span>
  </button>
);
