import { View } from "react-native";
import { cx } from "./lib/cx";

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
  <View className={cx("h-5 flex-row items-center gap-1.5", className)}>
    {Array.from({ length: count }, (_, i) => (
      <View
        key={i}
        className={cx(
          "size-1.5 rounded-full",
          i === activeIndex ? "bg-primary" : "bg-border",
        )}
      />
    ))}
  </View>
);
