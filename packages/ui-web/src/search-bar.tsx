import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "./lib/utils";

interface SearchBarProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  className?: string;
  /** 검색 아이콘 클릭 시 호출 — 지정하면 아이콘이 클릭 가능한 버튼이 된다(미지정 시 장식용) */
  onSearch?: () => void;
}

/**
 * SOURCE: Figma "FeelMap SearchBar" (node 13431:710) — 지도 검색바 (h 48).
 * State=focused는 focus-within: 인터랙션으로 처리.
 * onSearch를 넘기면 검색 아이콘이 버튼이 되어 클릭으로 검색을 커밋할 수 있다.
 *
 * @example
 * <SearchBar placeholder="장소, 격자, 영상 검색" value={q} onChange={onChange} onSearch={submit} />
 */
export const SearchBar = ({
  className,
  onSearch,
  ...props
}: SearchBarProps) => (
  <div
    className={cn(
      "flex h-[48px] w-full items-center gap-xs rounded-md border-[1.5px] border-transparent bg-background pl-md pr-sm shadow-raised transition-colors focus-within:border-primary",
      className,
    )}
  >
    <input
      type="search"
      className="min-w-0 flex-1 bg-transparent text-fm-title font-normal leading-none text-foreground outline-none placeholder:text-foreground-muted"
      {...props}
    />
    {onSearch ? (
      <button
        type="button"
        aria-label="검색"
        onClick={onSearch}
        className="shrink-0 text-icon transition-opacity active:opacity-60"
      >
        <Search className="size-[20px]" />
      </button>
    ) : (
      <Search className="size-[20px] shrink-0 text-icon" />
    )}
  </div>
);
