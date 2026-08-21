import { cn } from "@fillmap/ui-web";
import type { HourlyChart } from "@/features/map-home/model/hourly-uploads";
import { THEME_FILL_CLASS } from "./theme-classes";

interface GridHourlyChartProps {
  chart: HourlyChart;
}

/** 축 눈금 — 0·6·12·18시 (Figma 14629-3839) */
const AXIS_HOURS = [0, 6, 12, 18];

/**
 * 활발한 시간대 막대 그래프 (MSG-395 AC 12, Figma 14629-3839).
 *
 * **Figma는 이 그래프를 행정동 요약에 그렸으나 구현은 격자 상세에 둔다** (사용자 확정) —
 * 시간대 API가 격자 단위라 동 전체를 그리려면 동에 속한 격자 수만큼 요청이 나간다.
 *
 * 막대 높이는 스케일로 표현할 수 없는 비율(%)이라 인라인 스타일이다 (규칙 1 예외 범위).
 * 표본이 없으면 호출부가 이 컴포넌트를 렌더하지 않는다.
 */
export const GridHourlyChart = ({ chart }: GridHourlyChartProps) => (
  <section className="flex flex-col gap-xs">
    <h3 className="text-fm-body-strong text-foreground">
      활발한 시간대
      <span className="ml-xs text-fm-caption font-normal text-foreground-muted">
        영상 {chart.total}개 기준
      </span>
    </h3>

    <div className="flex h-14 items-end gap-px" aria-hidden>
      {chart.bars.map((bar) => (
        <span
          key={bar.hour}
          className="flex h-full flex-1 items-end rounded-xs bg-surface"
        >
          <span
            className={cn("w-full rounded-xs", THEME_FILL_CLASS.hot)}
            style={{ height: `${bar.ratio * 100}%` }}
          />
        </span>
      ))}
    </div>

    <div className="flex text-fm-caption text-foreground-muted">
      {AXIS_HOURS.map((hour) => (
        <span key={hour} className="flex-1">
          {hour}시
        </span>
      ))}
    </div>
  </section>
);
