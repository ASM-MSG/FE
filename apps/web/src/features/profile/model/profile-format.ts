/**
 * 프로필 표시 포맷 유틸 (AC 3).
 * 플랫폼(window·router) 무의존 — RN 재사용 대상.
 */

/** KST는 DST 없는 고정 UTC+9 — Intl 없이 상수 오프셋으로 변환한다 (RN 호환) */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 시각부 끝의 타임존 마커(Z 또는 ±hh:mm/±hhmm) 존재 여부 */
const hasTimezoneMarker = (timePart: string): boolean =>
  /(?:Z|[+-]\d{2}:?\d{2})$/.test(timePart);

const two = (n: number): string => String(n).padStart(2, "0");

/**
 * 가입일 ISO 문자열을 "YYYY.MM.DD"로 변환한다 (예: "2026-01-12" → "2026.01.12").
 * - 날짜만 오면(레거시 mock 형식) 그 표기를 그대로 취한다 — Date 파싱을 거치지 않아
 *   타임존에 따라 하루가 밀리지 않고(date-only ISO는 UTC 자정으로 해석되는 함정),
 *   한 자리 월·일은 제로 패딩한다.
 * - 시각이 붙으면 UTC로 취급해 KST(+9)로 옮긴 날짜를 표기한다 — 서버 createdAt은
 *   타임존 마커 없는 UTC 저장값 그대로라(MSG-373 명세), 날짜부를 그대로 자르면
 *   KST 00~09시 가입자의 가입일이 하루 전으로 밀린다 (codex 리뷰 환류).
 * - 연-월-일 3파트가 아니거나 시각부 파싱이 실패하면 원본을 반환한다 — 형식 편차 방어.
 */
export const formatJoinedDate = (iso: string): string => {
  const [datePart, timePart] = iso.split("T");
  const parts = datePart.split("-");
  if (parts.length !== 3) return iso;

  if (timePart === undefined) {
    const [year, month, day] = parts;
    return `${year}.${month.padStart(2, "0")}.${day.padStart(2, "0")}`;
  }

  // 마커가 없으면 UTC를 명시해 파싱한다 — 미표기 ISO를 로컬 시간으로 읽는 Date 규약 회피
  const utcMs = Date.parse(hasTimezoneMarker(timePart) ? iso : `${iso}Z`);
  if (Number.isNaN(utcMs)) return iso;

  const kst = new Date(utcMs + KST_OFFSET_MS);
  return `${kst.getUTCFullYear()}.${two(kst.getUTCMonth() + 1)}.${two(kst.getUTCDate())}`;
};
