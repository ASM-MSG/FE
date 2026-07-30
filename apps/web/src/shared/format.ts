/**
 * 크로스 도메인 표시 포맷 유틸.
 * 지도 SDK/플랫폼(window·router)에 의존하지 않는다 — RN 재사용 대상.
 * 원래 features/explore/model/cell-detail.ts에 있었으나 도감(MSG-121)도 쓰게 되어
 * 교차 feature import를 피하려고 shared로 이동했다 (기존 위치에서 re-export 유지).
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * 경과 시간을 "N분 전 / N시간 전 / N일 전"으로 변환한다.
 * 1분 미만은 "방금 전". `now`를 주입받아 결정적으로 테스트 가능하다.
 */
export const formatRelativeTime = (iso: string, now: Date = new Date()): string => {
  const elapsed = now.getTime() - new Date(iso).getTime();
  if (elapsed < MINUTE) return "방금 전";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`;
  return `${Math.floor(elapsed / DAY)}일 전`;
};

/** ISO 시각을 "M월 D일"로 변환한다 — 앞자리 0 없음 (MSG-253 AC 8, 예: "7월 21일"). */
export const formatMonthDay = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};
