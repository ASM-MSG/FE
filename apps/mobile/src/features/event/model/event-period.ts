import { kstDateOf } from "./event-chip";

/**
 * 종료 행사 기간 라벨 — 웹 `features/event/model/event-period.ts` 포팅 (MSG-557 D7).
 * "2026.7.17–8.9" — 연도는 시작에만 붙이고, 연도가 넘어가면 양쪽에 붙인다. 순수 함수.
 */
export const formatEventPeriod = (startsAt: string, endsAt: string): string => {
  const [startYear, startMonth, startDay] = kstDateOf(startsAt)
    .split("-")
    .map(Number);
  const [endYear, endMonth, endDay] = kstDateOf(endsAt).split("-").map(Number);
  const end =
    startYear === endYear
      ? `${endMonth}.${endDay}`
      : `${endYear}.${endMonth}.${endDay}`;
  return `${startYear}.${startMonth}.${startDay}–${end}`;
};
