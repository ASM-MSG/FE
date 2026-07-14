import type { ButtonHTMLAttributes } from "react";
import { cva } from "class-variance-authority";
import type { GridCellBaseProps } from "@fillmap/design-tokens";
import { cn } from "./lib/utils";

/**
 * SOURCE: Figma "FeelMap GridCell" (node 13405:690) — 지도 격자 (기본/수집/선택).
 * 크기는 지도 오버레이가 결정하므로 className으로 지정한다.
 * 채움 투명도는 Figma 렌더링 기준으로 근사 (기본: 옅은 테두리 / 수집: 진한 채움 / 선택: 옅은 채움 + 굵은 테두리).
 */
const gridCellVariants = cva("block transition-colors", {
  variants: {
    state: {
      default: "border-[1.5px] border-primary/40 bg-primary/5",
      collected: "border border-primary/60 bg-primary/40",
      selected: "border-2 border-primary bg-primary/15",
    },
  },
  defaultVariants: { state: "default" },
});

interface GridCellProps
  extends GridCellBaseProps,
    ButtonHTMLAttributes<HTMLButtonElement> {}

/**
 * @example
 * <GridCell state="collected" className="size-[130px]" onClick={onSelectCell} />
 */
export const GridCell = ({
  state,
  className,
  type = "button",
  ...props
}: GridCellProps) => (
  <button
    type={type}
    className={cn(gridCellVariants({ state }), className)}
    {...props}
  />
);
