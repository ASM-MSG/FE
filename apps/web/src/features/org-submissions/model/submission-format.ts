import type { OrgSubmissionHistoryEntry } from "@/entities/org-submission/model/org-submission";
import { hasTimezoneMarker, KST_OFFSET_MS } from "@/shared/kst-date";

/**
 * 신청 목록·요약 카드의 날짜 표기 (MSG-545 AC 2·4·5).
 * 순수 함수만 — Intl·플랫폼 API 무의존이라 RN 재사용 대상이다.
 */

/**
 * 서버 ISO를 KST 달력 연·월·일로 옮긴다.
 *
 * - 시각이 붙은 값(`updatedAt`·`changedAt`)은 타임존 마커가 없으면 UTC로 명시해 파싱한다 —
 *   미표기 ISO를 로컬 시간으로 읽는 Date 규약을 회피한다(그대로 자르면 KST 00~09시 전이가
 *   하루 전으로 밀린다, profile-format의 codex 리뷰 환류와 같은 함정).
 * - 날짜만 오는 값(`startsOn`·`endsOn`은 서버 LocalDate)은 UTC 자정으로 파싱되고 +9h를
 *   더해도 같은 날에 머물러 달력일이 보존된다.
 */
const toKstParts = (
  iso: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} => {
  const normalized =
    iso.includes("T") && !hasTimezoneMarker(iso) ? `${iso}Z` : iso;
  const kst = new Date(Date.parse(normalized) + KST_OFFSET_MS);
  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1,
    day: kst.getUTCDate(),
    hour: kst.getUTCHours(),
    minute: kst.getUTCMinutes(),
  };
};

/** "9.5" — 목록 행의 월.일 (앞자리 0 없음, Figma 15525:8652) */
const monthDot = (iso: string): string => {
  const { month, day } = toKstParts(iso);
  return `${month}.${day}`;
};

/** "2026. 8. 18." — 요약 카드의 연 포함 표기 */
const fullDate = (iso: string): string => {
  const { year, month, day } = toKstParts(iso);
  return `${year}. ${month}. ${day}.`;
};

/** "8. 19." — 요약 카드의 처리일(연 생략) 표기 */
const monthDayDate = (iso: string): string => {
  const { month, day } = toKstParts(iso);
  return `${month}. ${day}.`;
};

/**
 * 상세의 접수·처리·이력 시각 "2026. 9. 18. 10:24" (MSG-549 AC 5·6·7·9).
 * 시·분은 두 자리로 맞춘다(시안 "10:24") — 자정대가 "0:30"으로 흔들리지 않는다.
 */
export const formatKstDateTime = (iso: string): string => {
  const { hour, minute } = toKstParts(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  // 날짜부는 요약 카드와 같은 표기라 fullDate를 그대로 재사용한다 (중복 게이트 지적)
  return `${fullDate(iso)} ${pad(hour)}:${pad(minute)}`;
};

/**
 * 목록 행·상세 기본 정보의 행사 기간 "2026-09-05 ~ 09-07" (MSG-549 AC 1).
 * 서버 LocalDate("YYYY-MM-DD")를 자릿수로 자른다 — `new Date` 파싱을 거치지 않아
 * 실행 환경 타임존과 무관하다. 같은 해면 종료일의 연도를 생략한다(시안 표기).
 */
export const formatSubmissionDateRange = (
  startsOn: string,
  endsOn: string,
): string =>
  `${startsOn} ~ ${
    startsOn.slice(0, 4) === endsOn.slice(0, 4) ? endsOn.slice(5) : endsOn
  }`;

/** 목록 행의 기간 "9.5–9.7" (AC 2) — 구분자는 시안의 en dash */
export const formatSubmissionPeriod = (
  startsOn: string,
  endsOn: string,
): string => `${monthDot(startsOn)}–${monthDot(endsOn)}`;

/**
 * 요약 카드의 일자 한 줄 (AC 4·5, 추정 5).
 *
 * 목록 DTO에는 신청일·처리일이 없다(실측). 상세를 조회하는 반려 대표는 `history`(발생 순)의
 * 첫 entry를 신청일, 마지막 전이를 처리일로 파생한다. 상세를 조회하지 않는 비반려 대표는
 * 파생할 이력이 없어 `updatedAt` 하나만 표기한다.
 *
 * @param updatedAt 목록 행의 최종 수정 시각
 * @param history 상세 이력 — 미조회·실패는 null, 빈 배열도 updatedAt 표기로 내려간다
 */
export const submissionTimelineText = (
  updatedAt: string,
  history: OrgSubmissionHistoryEntry[] | null,
): string => {
  const entries = history ?? [];
  const first = entries[0];
  if (first === undefined) return `최종 수정 ${fullDate(updatedAt)}`;

  const applied = `신청 ${fullDate(first.changedAt)}`;
  const last = entries.length > 1 ? entries[entries.length - 1] : undefined;
  return last === undefined
    ? applied
    : `${applied} · 처리 ${monthDayDate(last.changedAt)}`;
};
