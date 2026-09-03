/**
 * 크로스 도메인 표시 포맷 유틸 — 웹 원본의 복제본 (MSG-296, D1 관례:
 * 복제 + 동등성 테스트, 공유 패키지 승격 아님).
 * - formatRelativeTime: 웹 `apps/web/src/shared/format.ts`
 * - formatViewCount: 웹 `apps/web/src/features/explore/model/cell-detail.ts`
 * 동등성은 format.parity.test.ts가 웹 원본을 직접 import해 단정한다.
 * formatDuration은 grid-video-card 로컬 함수를 이곳으로 이동 (두 번째 용례 발생).
 * formatKstDate는 features/profile/model/profile-format의 KST 보정 로직을 이곳으로 이동
 * (MSG-448에서 신고 시점 표기가 두 번째 용례 — 두 feature가 같은 변환을 쓰게 됐고
 * 교차 feature import는 FSD 위반이라 크로스 도메인 유틸의 자리인 여기로 올린다).
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * 경과 시간을 "N분 전 / N시간 전 / N일 전"으로 변환한다.
 * 1분 미만은 "방금 전". `now`를 주입받아 결정적으로 테스트 가능하다.
 */
export const formatRelativeTime = (
  iso: string,
  now: Date = new Date(),
): string => {
  const elapsed = now.getTime() - new Date(iso).getTime();
  if (elapsed < MINUTE) return "방금 전";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`;
  return `${Math.floor(elapsed / DAY)}일 전`;
};

/** 소수 첫째 자리까지, 10 이상이면 정수로 반올림해 문자열화 */
const compact = (value: number): string => {
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return String(rounded);
};

/** 반올림 시 1000K로 넘어가는 경계값 — 이 이상은 M 단위로 표기해야 "1000K" 오표기가 안 생긴다 */
const K_TO_M_THRESHOLD = 999_500;

/**
 * 조회수를 축약한다.
 * - 1000 미만: 원시 값 그대로 (138 → "138")
 * - 천 단위: 소수 첫째 자리 K (1400 → "1.4K")
 * - 만 단위 이상: 소수 없이 K (12000 → "12K")
 */
export const formatViewCount = (count: number): string => {
  if (count < 1_000) return String(count);
  if (count < K_TO_M_THRESHOLD) return `${compact(count / 1_000)}K`;
  return `${compact(count / 1_000_000)}M`;
};

/** 초 → "m:ss" 뱃지 표기 (예: 24 → "0:24") — 표시 전용 포맷 */
export const formatDuration = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/**
 * ISO 시각 → "N월 N일" (예: "8월 11일) — 웹 `apps/web/src/shared/format.ts`
 * `formatMonthDay`의 복제본 (MSG-427). 격자 점령 시작일·내 영상 촬영일 표기에 쓴다.
 * 동등성은 grid-videos.parity.test.ts의 `videoOwnerLabel` 대조가 함께 고정한다.
 */
export const formatMonthDay = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

/** KST는 DST 없는 고정 UTC+9 — Intl 없이 상수 오프셋으로 변환한다 (RN 호환) */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 시각부 끝의 타임존 마커(Z 또는 ±hh:mm/±hhmm) 존재 여부 */
const hasTimezoneMarker = (timePart: string): boolean =>
  /(?:Z|[+-]\d{2}:?\d{2})$/.test(timePart);

const two = (n: number): string => String(n).padStart(2, "0");

/**
 * ISO 시각 → KST 기준 "YYYY.MM.DD" (예: "2026-01-12T15:30:00" → "2026.01.13").
 * 웹 `apps/web/src/features/profile/model/profile-format.ts`의 KST 보정판이 원본이며,
 * 모바일에서는 가입일(profile-format)·신고 시점(report-history) 둘이 공유한다.
 *
 * - 날짜만 오면(레거시 mock 형식) 그 표기를 그대로 취한다 — Date 파싱을 거치지 않아
 *   타임존에 따라 하루가 밀리지 않고(date-only ISO는 UTC 자정으로 해석되는 함정),
 *   한 자리 월·일은 제로 패딩한다.
 * - 시각이 붙으면 UTC로 취급해 KST(+9)로 옮긴 날짜를 표기한다 — 서버 createdAt은
 *   타임존 마커 없는 UTC 저장값 그대로라(명세), 날짜부를 그대로 자르면 KST 00~09시
 *   기록이 하루 전으로 밀린다.
 * - 연-월-일 3파트가 아니거나 시각부 파싱이 실패하면 원본을 반환한다 — 형식 편차 방어.
 */
export const formatKstDate = (iso: string): string => {
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

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
/** 종성 ㄹ의 인덱스 — 받침이 ㄹ이면 "으로"가 아니라 "로"를 쓴다 */
const JONGSEONG_RIEUL = 8;

/**
 * 조사 "(으)로" 확정 — 받침 없음·ㄹ 받침은 "로", 나머지 받침은 "으로".
 * 한글 음절이 아닌 끝 글자는 받침 없음으로 본다(이름은 한글이 정본이라 폴백 경로다).
 * 웹 `apps/web/src/shared/format.ts`의 복제본 (MSG-559, 동등성은 format.parity.test.ts) —
 * 자동 이동 안내 토스트 "{지역명}(으)로 이동했어요"가 소비처다.
 */
export const euroJosa = (name: string): string => {
  const code = name.charCodeAt(name.length - 1);
  if (Number.isNaN(code) || code < HANGUL_BASE || code > HANGUL_LAST) {
    return "로";
  }
  const jongseong = (code - HANGUL_BASE) % 28;
  return jongseong === 0 || jongseong === JONGSEONG_RIEUL ? "로" : "으로";
};
