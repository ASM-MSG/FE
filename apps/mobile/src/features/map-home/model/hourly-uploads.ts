import type { HourlyUploadCountResponseDto } from "../../../shared/api/sdk";

/**
 * 활발한 시간대 막대 파생 (MSG-427 B9·B-11) — 순수 함수.
 * 지도 SDK/플랫폼에 의존하지 않는다.
 *
 * **웹(24칸)과 갈리는 유일한 포팅 모듈이다.** Figma 모바일 정본(14851:390)은 막대가
 * 8개 + 축 라벨 `0시·6시·12시·18시`라 서버가 주는 0~23시 24칸을 3칸씩 접는다.
 * 웹 원본과의 관계(모바일 i번째 = 웹 3i~3i+2 합)는 hourly-uploads.parity.test.ts가
 * 축약 관계로 단정한다 (스펙 추정 6).
 *
 * 입력은 **여러 격자의 응답을 이어붙인 목록**이다 (승인 Q3) — 시간대 API가 격자 단위뿐이라
 * 동 요약은 핫스코어 상위 5격자(HOT_SAMPLE_GRID_LIMIT)의 응답을 합산해 그린다.
 * 같은 시각이 여러 번 들어오므로 누적한다.
 */

const HOURS_IN_DAY = 24;

/** 막대 하나가 덮는 시간 폭 — Figma 8칸 구성의 귀결 */
export const HOURS_PER_BAR = 3;

/** 막대 개수 — 24 / 3 */
export const HOURLY_BAR_COUNT = HOURS_IN_DAY / HOURS_PER_BAR;

/** 한 시간대 막대 — ratio는 최대 칸을 1로 둔 상대 높이 */
export interface HourlyBar {
  /** 이 막대가 덮는 구간의 시작 시각 (0·3·6…21) */
  startHour: number;
  count: number;
  ratio: number;
}

export interface HourlyChart {
  bars: HourlyBar[];
  /** 표본 총수 — `영상 N개 기준` 문구의 근거 */
  total: number;
  /** 표본이 하나도 없으면 그래프 영역을 그리지 않는다 (B9) */
  hasData: boolean;
}

/**
 * 시간대 응답(들) → 3시간 단위 8칸 막대. [B9·B-11]
 * 서버는 업로드가 있는 시간대만 담아 보내므로 빈 구간을 0으로 메운다.
 * 절대 개수를 높이로 쓰면 활발한 격자와 한산한 격자가 같은 눈금을 못 쓰니 최대 칸을
 * 1로 정규화한다.
 */
export const deriveHourlyBars = (
  hours: HourlyUploadCountResponseDto[],
): HourlyChart => {
  const counts = Array.from({ length: HOURLY_BAR_COUNT }, () => 0);
  for (const { hour, count } of hours) {
    if (hour < 0 || hour >= HOURS_IN_DAY) continue;
    counts[Math.floor(hour / HOURS_PER_BAR)] += count;
  }

  const max = Math.max(...counts);
  const total = counts.reduce((sum, count) => sum + count, 0);

  return {
    bars: counts.map((count, index) => ({
      startHour: index * HOURS_PER_BAR,
      count,
      ratio: max > 0 ? count / max : 0,
    })),
    total,
    hasData: total > 0,
  };
};
