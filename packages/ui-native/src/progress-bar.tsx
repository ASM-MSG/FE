import { View } from "react-native";
import { cx } from "./lib/cx";

interface ProgressBarProps {
  /** 진행 비율 0~1 — 범위를 벗어난 값은 0~1로 클램프된다 */
  value: number;
  className?: string;
}

/**
 * 연속형 진행 바 — 트랙 + primary 채움. 업로드 분석 진행·도감 탐험률처럼
 * 비율을 표시하는 곳에 쓴다(n분할 단계 표시는 SegmentedProgress).
 * 채움 폭은 비율(%)이라 클래스로 표현할 수 없어 style width로 지정한다.
 *
 * @example
 * <ProgressBar value={0.42} />
 */
export const ProgressBar = ({ value, className }: ProgressBarProps) => {
  const ratio = Math.min(Math.max(value, 0), 1);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      className={cx(
        "h-1.5 w-full overflow-hidden rounded-full bg-border",
        className,
      )}
    >
      <View
        className="h-full rounded-full bg-primary"
        style={{ width: `${ratio * 100}%` }}
      />
    </View>
  );
};
