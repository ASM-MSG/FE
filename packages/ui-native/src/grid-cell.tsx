import { Pressable } from "react-native";
import type { GridCellBaseProps, GridCellState } from "@fillmap/design-tokens";
import { cx } from "./lib/cx";

/**
 * SOURCE: Figma "FeelMap GridCell" (node 13405:690) — 지도 격자 (기본/수집/선택).
 * 크기는 지도 오버레이가 결정하므로 className으로 지정한다.
 * 채움 투명도는 ui-web grid-cell.tsx와 동일 근사값.
 */
const stateClass: Record<GridCellState, string> = {
  default: "border-[1.5px] border-primary/40 bg-primary/5",
  collected: "border border-primary/60 bg-primary/40",
  selected: "border-2 border-primary bg-primary/15",
};

interface GridCellProps extends GridCellBaseProps {
  onPress?: () => void;
  className?: string;
}

/**
 * @example
 * <GridCell state="collected" className="size-32.5" onPress={onSelectCell} />
 */
export const GridCell = ({ state = "default", onPress, className }: GridCellProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    className={cx(stateClass[state], className)}
  />
);
