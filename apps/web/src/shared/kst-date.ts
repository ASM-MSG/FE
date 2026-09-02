/**
 * KST 시각 변환 원시 (MSG-545) — 서버가 내려주는 ISO 문자열을 한국 달력일로 옮길 때
 * 쓰는 공통 상수·판별식이다.
 *
 * `profile-format`(가입일)과 `org-submissions/submission-format`(신청·처리일)이 같은 두
 * 선언을 복제하게 되어 추출했다 (중복 게이트 검출 — envelope-response·stub-fetch 선례).
 * `apps/mobile/src/shared/format.ts`의 같은 선언은 앱 미러라 여기서 흡수하지 않는다.
 *
 * 순수 값·함수뿐이라 플랫폼(window·document) 무의존 — RN 재사용 대상이다.
 */

/** KST는 DST 없는 고정 UTC+9 — Intl 없이 상수 오프셋으로 변환한다 */
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 시각부 끝의 타임존 마커(Z 또는 ±hh:mm/±hhmm) 존재 여부 */
export const hasTimezoneMarker = (iso: string): boolean =>
  /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso);
