import { View } from "react-native";
import { cx } from "./lib/cx";

interface DotsProps {
  /** 전체 페이지 수. 기본 3 */
  count?: number;
  /** 활성 페이지 인덱스 (0부터). 기본 0 */
  activeIndex?: number;
  /** 활성 점 모양. 기본 "circle"(기존 렌더 불변), "pill"은 활성 점만 가로 pill 16×6 (온보딩 14133:540) */
  activeShape?: "circle" | "pill";
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap Dots" (node 13404:703) — 페이지 인디케이터.
 *
 * @example
 * <Dots count={5} activeIndex={page} />
 * <Dots activeIndex={step} activeShape="pill" />
 */
export const Dots = ({
  count = 3,
  activeIndex = 0,
  activeShape = "circle",
  className,
}: DotsProps) => (
  <View className={cx("h-5 flex-row items-center gap-1.5", className)}>
    {Array.from({ length: count }, (_, i) => (
      <View
        key={i}
        className={cx(
          "rounded-full",
          i === activeIndex
            ? cx(
                "bg-primary",
                activeShape === "pill" ? "h-1.5 w-4" : "size-1.5",
              )
            : "size-1.5 bg-border",
        )}
      />
    ))}
  </View>
);
