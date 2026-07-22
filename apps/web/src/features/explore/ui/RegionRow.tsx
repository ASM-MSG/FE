import { ChevronRight } from "lucide-react";

interface RegionRowProps {
  /** 구 이름 (예: "부산진구") */
  name: string;
  /** 격자 수 (목값) */
  count: number;
  /** 행 클릭 시 해당 지역 필터 적용 */
  onSelect: (name: string) => void;
}

/**
 * 전체 지역 행 — 구 이름 + "격자 N" 개수 + 오른쪽 화살표(›).
 */
export const RegionRow = ({ name, count, onSelect }: RegionRowProps) => (
  <button
    type="button"
    onClick={() => onSelect(name)}
    className="flex w-full items-center gap-sm py-sm text-left transition-colors active:bg-surface"
  >
    <span className="flex-1 truncate text-fm-base font-medium text-foreground">
      {name}
    </span>
    <span className="shrink-0 text-fm-body text-foreground-muted">
      격자 {count.toLocaleString()}
    </span>
    <ChevronRight className="size-4 shrink-0 text-icon" />
  </button>
);
