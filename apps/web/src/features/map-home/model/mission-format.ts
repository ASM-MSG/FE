/**
 * 미션 표시 문자열 포맷 (MSG-395 AC 14·17·22).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * `shared/format.ts`의 `formatDuration`은 **영상 길이(초)** 전용이라 코스 소요시간(분)은
 * 여기서 따로 만든다 — 같은 이름을 피해 `formatCourseDuration`으로 둔다.
 */

/** 이름 있는 엔티티 표 — 서버 원문에서 실제로 관측된 것만 (실측: `&#x27;`) + HTML 기본 5종 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * 서버 문자열의 HTML 엔티티 복원 (MSG-395 AC 13).
 * 미션 제목·장소명이 HTML 이스케이프된 채로 온다 — 실측: `에일리언스테이지 &#x27;AaD&#x27;`.
 * React는 텍스트를 그대로 그리므로 디코드하지 않으면 사용자가 `&#x27;`를 읽게 된다.
 *
 * 디코드 결과는 다시 텍스트로만 쓴다 — 지도 이름표(innerHTML 경로)는 MapCanvas가
 * 자체 `escapeHtml`로 재이스케이프하므로 주입 경로가 생기지 않는다.
 * `innerHTML` 파싱으로 디코드하는 흔한 방법은 쓰지 않는다: 그 자체가 주입 통로다.
 */
export const decodeHtmlEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    const lower = body.toLowerCase();
    if (lower.startsWith("#x"))
      return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    if (lower.startsWith("#"))
      return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
    return NAMED_ENTITIES[lower] ?? match;
  });

/** 월.일 (로컬 달력 — mission-status와 같은 전제) */
const monthDay = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getMonth() + 1}.${date.getDate()}`;
};

/**
 * 축제 기간 표기 — `8.11~8.16`. [AC 17]
 * 시작이 없으면 종료일만 알리고(`10.4까지`), 둘 다 없으면 상시다.
 */
export const formatMissionPeriod = (
  startAt: string | null,
  endAt: string | null,
): string => {
  if (startAt !== null && endAt !== null)
    return `${monthDay(startAt)}~${monthDay(endAt)}`;
  if (endAt !== null) return `${monthDay(endAt)}까지`;
  if (startAt !== null) return `${monthDay(startAt)}부터`;
  return "상시";
};

/** 팝업 운영시간 — 없으면 추후공지. [AC 14] */
export const formatOperationTime = (operationTime: string | null): string =>
  operationTime !== null && operationTime !== ""
    ? operationTime
    : "운영시간 추후공지";

/** 코스 거리 — 미터를 km로. 없으면 null이라 뷰가 줄을 그리지 않는다. [AC 22] */
export const formatDistanceKm = (
  distanceMeters: number | null,
): string | null => {
  if (distanceMeters === null) return null;
  const km = Math.round(distanceMeters / 100) / 10;
  return `${Number.isInteger(km) ? km : km.toFixed(1)}km`;
};

/** 코스 소요 시간 — `5시간 30분`. 없으면 null. [AC 22] */
export const formatCourseDuration = (
  durationMinutes: number | null,
): string | null => {
  if (durationMinutes === null) return null;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (hours === 0) return `${minutes}분`;
  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
};
