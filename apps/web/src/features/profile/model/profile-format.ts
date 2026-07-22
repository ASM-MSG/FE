/**
 * 프로필 표시 포맷 유틸 (AC 3).
 * 플랫폼(window·router) 무의존 — RN 재사용 대상.
 */

/**
 * 가입일 ISO 문자열을 "YYYY.MM.DD"로 변환한다 (예: "2026-01-12" → "2026.01.12").
 * 문자열의 날짜부만 취한다 — Date 파싱을 거치지 않아 타임존에 따라 하루가 밀리지 않고
 * (date-only ISO는 UTC 자정으로 해석되는 함정), 한 자리 월·일은 제로 패딩한다.
 */
export const formatJoinedDate = (iso: string): string => {
  const [datePart] = iso.split("T");
  const [year, month, day] = datePart.split("-");
  return `${year}.${month.padStart(2, "0")}.${day.padStart(2, "0")}`;
};
