import type { HourlyUploadCountResponseDto } from "@/shared/api/generated";

/**
 * 격자 시간대 업로드 → 막대 그래프 표시 모델 (MSG-395 AC 12).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * Figma(14629-3839)는 이 그래프를 **행정동 요약**에 그렸으나 구현은 **격자 상세**에 둔다
 * (사용자 확정) — 시간대 API가 격자 단위라 동 전체 합산은 격자 수만큼 요청이 나간다.
 */

const HOURS_IN_DAY = 24;

/** 한 시간대 막대 — ratio는 최대 시간대를 1로 둔 상대 높이 */
export interface HourlyBar {
  hour: number;
  count: number;
  ratio: number;
}

export interface HourlyChart {
  bars: HourlyBar[];
  /** 표본 총수 — `영상 N개 기준` 문구의 근거 */
  total: number;
  /** 표본이 하나도 없으면 그래프 영역을 그리지 않는다 */
  hasData: boolean;
}

/**
 * 응답의 시간대 목록 → 24칸 막대. [AC 12]
 * 서버는 업로드가 있는 시간대만 담아 보내므로 빈 시간대를 0으로 메운다.
 * 절대 개수를 높이로 쓰면 활발한 격자와 한산한 격자의 그래프가 같은 눈금을 못 쓰니
 * 최대 시간대를 1로 정규화한다.
 */
export const deriveHourlyBars = (
  hours: HourlyUploadCountResponseDto[],
): HourlyChart => {
  const counts = Array.from({ length: HOURS_IN_DAY }, () => 0);
  for (const { hour, count } of hours) {
    if (hour >= 0 && hour < HOURS_IN_DAY) counts[hour] += count;
  }

  const max = Math.max(...counts);
  const total = counts.reduce((sum, count) => sum + count, 0);

  return {
    bars: counts.map((count, hour) => ({
      hour,
      count,
      ratio: max > 0 ? count / max : 0,
    })),
    total,
    hasData: total > 0,
  };
};
