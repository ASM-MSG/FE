import { cn } from "./lib/utils";

interface CellBadgeProps {
  /** 격자 라벨 (예: "A-14") */
  label: string;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap CellBadge" (node 13404:700) — 지도 격자 라벨 배지.
 *
 * @example
 * <CellBadge label="A-14" />
 */
export const CellBadge = ({ label, className }: CellBadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center justify-center rounded-sm bg-primary px-sm py-1.25 text-fm-body-strong text-primary-foreground shadow-raised",
      className,
    )}
  >
    {label}
  </span>
);
