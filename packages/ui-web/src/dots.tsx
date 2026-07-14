import { cn } from "./lib/utils";

interface DotsProps {
  /** 전체 페이지 수. 기본 3 */
  count?: number;
  /** 활성 페이지 인덱스 (0부터). 기본 0 */
  activeIndex?: number;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap Dots" (node 13404:703) — 페이지 인디케이터.
 *
 * @example
 * <Dots count={5} activeIndex={page} />
 */
export const Dots = ({ count = 3, activeIndex = 0, className }: DotsProps) => (
  <div className={cn("flex h-[20px] items-center gap-[6px]", className)}>
    {Array.from({ length: count }, (_, i) => (
      <span
        key={i}
        className={cn(
          "size-[6px] rounded-full",
          i === activeIndex ? "bg-primary" : "bg-border",
        )}
      />
    ))}
  </div>
);
