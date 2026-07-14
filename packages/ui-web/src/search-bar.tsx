import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "./lib/utils";

interface SearchBarProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap SearchBar" (node 13431:710) — 지도 검색바 (h 48).
 * State=focused는 focus-within: 인터랙션으로 처리.
 *
 * @example
 * <SearchBar placeholder="장소, 격자, 영상 검색" value={q} onChange={onChange} />
 */
export const SearchBar = ({ className, ...props }: SearchBarProps) => (
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
    <Search className="size-[20px] shrink-0 text-icon" />
  </div>
);
