import { kstDateOf } from "./event-chip";

/**
 * 아카이브 기간 라벨 (MSG-519 AC 4) — "2026.7.17–8.9" (Figma 15518:7350 문자열, 0패딩 없음).
 * KST 날짜부 기준(event-chip `kstDateOf` 선례 재사용) — 연도는 시작에만 붙이고,
 * 연도가 넘어가면 양쪽에 붙인다. 순수 함수 — 플랫폼 무의존, RN 재사용 대상.
 * 표시용 포맷팅일 뿐 1개월 판정 산술이 아니다 — 판정 주체는 서버 status (AC 8).
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
