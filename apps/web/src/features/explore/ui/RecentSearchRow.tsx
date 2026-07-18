import { Clock, X } from "lucide-react";

interface RecentSearchRowProps {
  /** 최근 검색어 */
  term: string;
  /** 검색어 클릭 시 그 검색어로 필터 적용 */
  onSelect: (term: string) => void;
  /** ✕ 클릭 시 해당 항목만 제거 */
  onRemove: (term: string) => void;
}

/**
 * 최근 검색 행 — 원형 아이콘 + 검색어 + 개별 삭제(✕).
 * 검색(행 클릭)과 삭제(✕)를 형제 버튼으로 분리해 이벤트 버블링 충돌을 피한다.
 */
export const RecentSearchRow = ({
  term,
  onSelect,
  onRemove,
}: RecentSearchRowProps) => (
  <div className="flex items-center gap-sm">
    <button
      type="button"
      onClick={() => onSelect(term)}
      className="flex min-w-0 flex-1 items-center gap-sm py-xs text-left"
    >
      <Clock className="size-4 shrink-0 text-foreground-muted" />
      <span className="truncate text-fm-base text-foreground">{term}</span>
    </button>
    <button
      type="button"
      aria-label={`${term} 검색 기록 삭제`}
      onClick={() => onRemove(term)}
      className="shrink-0 p-xxs text-foreground-muted transition-opacity active:opacity-60"
    >
      <X className="size-4" />
    </button>
  </div>
);
