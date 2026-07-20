import type { HighlightSuggestion } from "@/features/upload/model/highlight-selection";
import { SegmentRow } from "./SegmentRow";

interface SegmentListProps {
  suggestions: HighlightSuggestion[];
  /** 현재 선택된 추천 구간 id (직접 지정 선택 중이면 null) */
  selectedId: string | null;
  onSelect: (suggestion: HighlightSuggestion) => void;
  onPlay: (suggestion: HighlightSuggestion) => void;
}

/**
 * AI 추천 구간 리스트 — 3~5개 항목을 세로로 나열한다. [S4]
 */
export const SegmentList = ({
  suggestions,
  selectedId,
  onSelect,
  onPlay,
}: SegmentListProps) => (
  <div className="flex w-full flex-col gap-xs">
    {suggestions.map((suggestion) => (
      <SegmentRow
        key={suggestion.id}
        suggestion={suggestion}
        selected={suggestion.id === selectedId}
        onSelect={() => onSelect(suggestion)}
        onPlay={() => onPlay(suggestion)}
      />
    ))}
  </div>
);
