import { View } from "react-native";
import { cx } from "./lib/cx";

interface SegmentedProgressProps {
  /** 전체 단계 수 (세그먼트 개수) */
  total: number;
  /** 현재까지 완료한 단계 수 — 0~total로 클램프된다 */
  current: number;
  className?: string;
}

/**
 * SOURCE: Figma 온보딩 v2 progress-1~3 (node 14875:430, 각 108.67×3, gap 8) —
 * n분할 단계 진행 바. 세그먼트는 균등폭(flex-1)이라 폭은 부모가 정한다.
 * 연속형(비율) 진행은 ProgressBar를 쓴다.
 *
 * @example
 * <SegmentedProgress total={3} current={2} />
 */
export const SegmentedProgress = ({
  total,
  current,
  className,
}: SegmentedProgressProps) => {
  // total이 음수면 세그먼트는 0개로 렌더되는데(Array.from이 음수 길이를 0으로 클램프),
  // 클램프 없이는 accessibilityValue가 max<min·now<0인 진행바로 낭독된다.
  const safeTotal = Math.max(total, 0);
  const filled = Math.min(Math.max(current, 0), safeTotal);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: safeTotal, now: filled }}
      className={cx("w-full flex-row gap-xs", className)}
    >
      {Array.from({ length: safeTotal }, (_, index) => (
        <View
          key={index}
          className={cx(
            "h-0.75 flex-1 rounded-full",
            index < filled ? "bg-primary" : "bg-border",
          )}
        />
      ))}
    </View>
  );
};
