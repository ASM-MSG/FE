import { describe, expect, it } from "vitest";
import { deriveHourlyBars } from "./hourly-uploads";

describe("deriveHourlyBars — 시간대 업로드를 막대 높이로 바꾼다 (AC 12)", () => {
  it("응답에 없는 시간대는 0으로 채워 24칸을 만든다 (AC 12)", () => {
    const chart = deriveHourlyBars([{ hour: 18, count: 4 }]);

    expect(chart.bars).toHaveLength(24);
    expect(chart.bars[0].count).toBe(0);
    expect(chart.bars[18].count).toBe(4);
  });

  it("최대 시간대를 1로 두고 나머지를 상대 높이로 만든다 (AC 12)", () => {
    const chart = deriveHourlyBars([
      { hour: 17, count: 2 },
      { hour: 18, count: 4 },
    ]);

    expect(chart.bars[18].ratio).toBe(1);
    expect(chart.bars[17].ratio).toBe(0.5);
    expect(chart.bars[0].ratio).toBe(0);
  });

  it("표본 총수는 전 시간대 합이다 (AC 12)", () => {
    const chart = deriveHourlyBars([
      { hour: 12, count: 1 },
      { hour: 18, count: 3 },
    ]);

    expect(chart.total).toBe(4);
  });

  it("전 시간대가 0이면 그래프를 그리지 않는다 (AC 12)", () => {
    expect(deriveHourlyBars([]).hasData).toBe(false);
    expect(deriveHourlyBars([{ hour: 3, count: 0 }]).hasData).toBe(false);
  });

  it("표본이 하나라도 있으면 그래프를 그린다 (경계)", () => {
    expect(deriveHourlyBars([{ hour: 3, count: 1 }]).hasData).toBe(true);
  });

  it("범위 밖 시간(hour)은 무시한다 (경계)", () => {
    const chart = deriveHourlyBars([
      { hour: 24, count: 9 },
      { hour: 5, count: 2 },
    ]);

    expect(chart.total).toBe(2);
    expect(chart.bars[5].count).toBe(2);
  });
});
