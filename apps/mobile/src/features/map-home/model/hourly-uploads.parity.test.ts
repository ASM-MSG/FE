import { describe, expect, it } from "vitest";
import type { HourlyUploadCountResponseDto } from "../../../shared/api/sdk";
import {
  HOURLY_BAR_COUNT,
  HOURS_PER_BAR,
  deriveHourlyBars,
} from "./hourly-uploads";

/**
 * B9·B-11: 활발한 시간대가 `hourly-uploads` 응답을 **3시간 단위 8칸**으로 접고 최대 칸을
 * 1로 정규화한 상대 높이를 낸다. 여러 격자(상위 5격자) 응답을 이어붙여 넘기면 합산된다.
 * 표본이 0건이면 `hasData=false`라 뷰가 그래프 영역을 그리지 않는다 (MSG-427).
 *
 * 웹 원본은 24칸이라 값 동등이 아니라 **축약 관계**로 대조한다 (스펙 추정 6):
 * 모바일 i번째 막대 = 웹 3i·3i+1·3i+2 막대 합.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/map-home/model/hourly-uploads.ts",
  import.meta.url,
).pathname;

interface WebHourly {
  deriveHourlyBars: (hours: HourlyUploadCountResponseDto[]) => {
    bars: { hour: number; count: number; ratio: number }[];
    total: number;
    hasData: boolean;
  };
}

const loadWeb = (): Promise<WebHourly> => import(WEB_PATH);

/** 상위 격자 2곳의 응답을 이어붙인 표본 — 같은 시간대가 두 번 나온다 */
const HOURS: HourlyUploadCountResponseDto[] = [
  { hour: 1, count: 2 },
  { hour: 4, count: 1 },
  { hour: 13, count: 6 },
  { hour: 21, count: 3 },
  { hour: 1, count: 4 },
  { hour: 13, count: 2 },
  { hour: 99, count: 100 },
];

describe("deriveHourlyBars — 3시간 단위 8칸 (B9·B-11)", () => {
  it("막대가 8칸(3시간 단위)이고 시작 시각이 0·3·6…21이다", () => {
    const chart = deriveHourlyBars(HOURS);

    expect(HOURS_PER_BAR).toBe(3);
    expect(HOURLY_BAR_COUNT).toBe(8);
    expect(chart.bars).toHaveLength(8);
    expect(chart.bars.map((bar) => bar.startHour)).toEqual([
      0, 3, 6, 9, 12, 15, 18, 21,
    ]);
  });

  it("여러 격자 응답을 합산하고 범위 밖 시각은 버린다", () => {
    const chart = deriveHourlyBars(HOURS);

    expect(chart.bars.map((bar) => bar.count)).toEqual([
      6, 1, 0, 0, 8, 0, 0, 3,
    ]);
    expect(chart.total).toBe(18);
    expect(chart.hasData).toBe(true);
  });

  it("최대 칸을 1로 정규화한 상대 높이를 낸다", () => {
    const chart = deriveHourlyBars(HOURS);

    expect(Math.max(...chart.bars.map((bar) => bar.ratio))).toBe(1);
    expect(chart.bars[0].ratio).toBeCloseTo(6 / 8, 10);
  });

  it("표본이 0건이면 그래프를 그리지 않는다 (hasData=false)", () => {
    const chart = deriveHourlyBars([]);

    expect(chart.total).toBe(0);
    expect(chart.hasData).toBe(false);
    expect(chart.bars.every((bar) => bar.ratio === 0)).toBe(true);
  });

  it("웹 24칸 파생의 3칸 합과 같다 (축약 관계)", async () => {
    const web = await loadWeb();
    const webChart = web.deriveHourlyBars(HOURS);
    const chart = deriveHourlyBars(HOURS);

    expect(chart.total).toBe(webChart.total);
    expect(chart.hasData).toBe(webChart.hasData);
    for (let i = 0; i < HOURLY_BAR_COUNT; i += 1) {
      const sum = webChart.bars
        .slice(i * HOURS_PER_BAR, (i + 1) * HOURS_PER_BAR)
        .reduce((acc, bar) => acc + bar.count, 0);
      expect(chart.bars[i].count).toBe(sum);
    }
  });
});
