import { View } from "react-native";
import { cx } from "./lib/cx";

interface ProgressBarProps {
  /** 진행 비율 0~1 — 범위를 벗어난 값은 0~1로 클램프된다 */
  value: number;
  /** 트랙(바깥 상자)에 덧붙일 클래스 — 높이·여백 조정용 */
  className?: string;
  /**
   * 채움(안쪽 바)에 덧붙일 클래스 (MSG-427 비파괴 확장) — 기본 `bg-primary`가 아닌
   * 테마 색으로 칠해야 하는 곳(코스 진행 바 = theme-route)이 쓴다. 미지정 시 렌더 불변.
   *
   * NativeWind는 클래스 **문자열 순서가 아니라 CSS 캐스케이드**로 승자를 정하므로,
   * 기본값(`bg-primary`)을 덮으려면 important 수식자를 쓴다(예: `!bg-theme-route`) —
   * `className`으로 높이를 덮을 때(`!h-2`)와 같은 규칙이다.
   */
  fillClassName?: string;
}

/**
 * 연속형 진행 바 — 트랙 + primary 채움. 업로드 분석 진행·도감 탐험률처럼
 * 비율을 표시하는 곳에 쓴다(n분할 단계 표시는 SegmentedProgress).
 * 채움 폭은 비율(%)이라 클래스로 표현할 수 없어 style width로 지정한다.
 *
 * @example
 * <ProgressBar value={0.42} />
 * <ProgressBar value={0.42} className="!h-1" fillClassName="!bg-theme-route" />
 */
export const ProgressBar = ({
  value,
  className,
  fillClassName,
}: ProgressBarProps) => {
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
        className={cx("h-full rounded-full bg-primary", fillClassName)}
        style={{ width: `${ratio * 100}%` }}
      />
    </View>
  );
};
