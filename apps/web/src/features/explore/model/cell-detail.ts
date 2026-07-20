/**
 * 상세 시트 표시용 순수 포맷 함수. [AC 13·14]
 * 지도 SDK/플랫폼(window·router)에 의존하지 않는다 — RN 재사용 대상.
 */

/** 소수 첫째 자리까지, 10 이상이면 정수로 반올림해 문자열화 */
const compact = (value: number): string => {
  const rounded =
    value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return String(rounded);
};

/**
 * 조회수를 축약한다. [AC 13]
 * - 1000 미만: 원시 값 그대로 (138 → "138")
 * - 천 단위: 소수 첫째 자리 K (1400 → "1.4K")
 * - 만 단위 이상: 소수 없이 K (12000 → "12K")
 */
export const formatViewCount = (count: number): string => {
  if (count < 1_000) return String(count);
  if (count < 1_000_000) return `${compact(count / 1_000)}K`;
  return `${compact(count / 1_000_000)}M`;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * 경과 시간을 "N분 전 / N시간 전 / N일 전"으로 변환한다. [AC 14]
 * 1분 미만은 "방금 전". `now`를 주입받아 결정적으로 테스트 가능하다.
 */
export const formatRelativeTime = (iso: string, now: Date = new Date()): string => {
  const elapsed = now.getTime() - new Date(iso).getTime();
  if (elapsed < MINUTE) return "방금 전";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`;
  return `${Math.floor(elapsed / DAY)}일 전`;
};
