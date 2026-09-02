import type {
  EventOccurrenceChip,
  EventOccurrenceStatus,
} from "../../../entities/event/model/event";

/**
 * 행사 칩 파생 — 웹 `features/event/model/event-chip.ts` 포팅 (MSG-557 D7·D8).
 * `cityLabel`(역지오코딩 축약)은 앱이 DTO `cityName`을 쓰므로 옮기지 않았다 (D6).
 * 동등성은 event-chip.parity.test.ts가 웹 원본을 동적 import해 단정한다.
 *
 * KST 안전 날짜 산술: 날짜를 epoch 일수 정수(Date.UTC 산술)로 바꿔 계산한다 —
 * 실행 환경 TZ 무관 결정적. "오늘"은 호출자가 주입한다(useKstToday).
 */

export const DAY_MS = 86_400_000;
export const KST_OFFSET_MS = 9 * 3_600_000;

/** KST 기준 오늘 날짜 "YYYY-MM-DD" */
export const todayKstDate = (nowMs: number = Date.now()): string =>
  new Date(nowMs + KST_OFFSET_MS).toISOString().slice(0, 10);

/** "YYYY-MM-DD" → epoch 일수 (UTC 산술 — TZ 무관) */
const toDayIndex = (date: string): number => {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
};

/**
 * date-time 문자열의 KST 날짜부 "YYYY-MM-DD".
 * 오프셋이 없으면(서버 LocalDateTime) 문자열 자체가 KST 벽시계라 날짜부를 그대로 읽고,
 * Z·±hh:mm 오프셋이 있으면 epoch로 환산 후 +9h를 더해 KST 날짜를 얻는다.
 */
export const kstDateOf = (dateTime: string): string => {
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(dateTime);
  if (!hasOffset) return dateTime.slice(0, 10);
  return new Date(Date.parse(dateTime) + KST_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
};

/** startsAt 기준 D-day 라벨 — 당일·경과는 "D-0"으로 통일한다 (음수 D-day 금지) */
export const dDayLabel = (startsAt: string, todayKst: string): string => {
  const days = toDayIndex(kstDateOf(startsAt)) - toDayIndex(todayKst);
  return `D-${Math.max(days, 0)}`;
};

/** 세그먼트 하나의 뷰 재료 — 라벨은 `title` (+ UPCOMING이면 D-day) */
export interface EventSegmentView {
  occurrenceId: number;
  title: string;
  status: EventOccurrenceStatus;
  /** UPCOMING이면 "D-n", LIVE면 null — 진행 중 행사는 D-day를 표기하지 않는다 */
  dDay: string | null;
}

/** 칩 목록 → 세그먼트 뷰 — 서버 정렬(시이름→시작일→id)을 그대로 유지한다 */
export const toEventSegments = (
  chips: EventOccurrenceChip[],
  todayKst: string,
): EventSegmentView[] =>
  chips.map((chip) => ({
    occurrenceId: chip.occurrenceId,
    title: chip.title,
    status: chip.status,
    dDay:
      chip.status === "UPCOMING" ? dDayLabel(chip.startsAt, todayKst) : null,
  }));
