import { Text, View } from "react-native";
import { cx } from "@fillmap/ui-native";
import type { HourlyChart } from "../model/hourly-uploads";
import { THEME_FILL_CLASS } from "./theme-classes";

/**
 * 활발한 시간대 막대 그래프 (MSG-427 B9·B-11) — Figma 실측: 막대 **8개**(24개가 아니다)
 * + 축 라벨 `0시·6시·12시·18시` + 헤더 `활발한 시간대 / 영상 N개 기준`.
 *
 * 파생(3시간 단위 접기·정규화)은 model `deriveHourlyBars`가 하고 여기는 렌더만 한다.
 * 막대 높이는 스케일로 표현할 수 없는 비율(%)이라 인라인 스타일이다 (토큰 규칙 예외 범위).
 * 표본이 없으면 호출부가 이 컴포넌트를 렌더하지 않는다.
 */
const AXIS_HOURS = [0, 6, 12, 18];

interface HourlyBarsProps {
  chart: HourlyChart;
}

export const HourlyBars = ({ chart }: HourlyBarsProps) => (
  <View className="gap-xs">
    <View className="flex-row items-baseline gap-xs">
      <Text className="text-fm-body-strong text-foreground">활발한 시간대</Text>
      <Text className="text-fm-caption text-foreground-muted">
        영상 {chart.total}개 기준
      </Text>
    </View>

    <View className="h-14 flex-row items-end gap-px">
      {chart.bars.map((bar) => (
        <View
          key={bar.startHour}
          className="h-full flex-1 justify-end rounded-xs bg-surface"
        >
          <View
            className={cx("w-full rounded-xs", THEME_FILL_CLASS.hot)}
            style={{ height: `${bar.ratio * 100}%` }}
          />
        </View>
      ))}
    </View>

    <View className="flex-row">
      {AXIS_HOURS.map((hour) => (
        <Text
          key={hour}
          className="flex-1 text-fm-caption text-foreground-muted"
        >
          {hour}시
        </Text>
      ))}
    </View>
  </View>
);
