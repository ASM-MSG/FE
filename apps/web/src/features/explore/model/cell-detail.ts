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
/** 반올림 시 1000K로 넘어가는 경계값 — 이 이상은 M 단위로 표기해야 "1000K" 오표기가 안 생긴다 */
const K_TO_M_THRESHOLD = 999_500;

export const formatViewCount = (count: number): string => {
  if (count < 1_000) return String(count);
  if (count < K_TO_M_THRESHOLD) return `${compact(count / 1_000)}K`;
  return `${compact(count / 1_000_000)}M`;
};

/**
 * 상대 시간 포맷 [AC 14] — 도감(MSG-121)과 공용이라 shared/format으로 이동, 호출부 호환용 re-export.
 * 구현·테스트 명세는 shared/format.ts 참조.
 */
export { formatRelativeTime } from "@/shared/format";
