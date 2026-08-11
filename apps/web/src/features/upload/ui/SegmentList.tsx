import type { HighlightSuggestion } from "@/features/upload/model/highlight-selection";
import { SegmentRow } from "./SegmentRow";

interface SegmentListProps {
  suggestions: HighlightSuggestion[];
  /** 현재 선택된 추천 구간 id (직접 지정 선택 중이면 null) */
  selectedId: string | null;
  /** 카드 선택 — 선택 + 구간 미리 재생 (B7) */
  onSelect: (suggestion: HighlightSuggestion) => void;
}

/**
 * AI 추천 구간 리스트 (B6) — 서버 응답 개수만큼(1~3) 배열 순서(=우선순위) 그대로 나열한다.
 */
export const SegmentList = ({
  suggestions,
  selectedId,
  onSelect,
}: SegmentListProps) => (
  <div className="flex w-full flex-col gap-xs">
    {suggestions.map((suggestion) => (
      <SegmentRow
        key={suggestion.id}
        suggestion={suggestion}
        selected={suggestion.id === selectedId}
        onSelect={() => onSelect(suggestion)}
      />
    ))}
  </div>
);
