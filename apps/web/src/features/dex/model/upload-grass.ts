import type { UploadHistoryDay } from "@/entities/dex";

/**
 * 업로드 잔디 파생 (MSG-414 AC 4·5·6) — GitHub 기여그래프 구조: 주 시작=일요일(행 0),
 * 오늘이 속한 주가 마지막 열. 탭은 24주, 모달은 53주(1년) 창을 같은 함수로 파생한다.
 *
 * KST 안전 날짜 산술 (스펙 리스크 "타임존"): uploadDate는 KST 날짜 라벨("YYYY-MM-DD")이다.
 * `new Date("YYYY-MM-DD")`는 UTC 자정으로 파싱돼 로컬 TZ에 따라 하루가 밀리므로,
 * 날짜를 epoch 일수 정수(Date.UTC 산술)로 바꿔 계산한다 — 실행 환경 TZ 무관 결정적.
 * "오늘"은 호출자가 주입한다(테스트 결정성) — 실사용 진입점은 todayKstDate().
 * 순수 함수 — 플랫폼 무의존, RN 재사용 대상.
 */

/** 기록 탭 잔디 창 — 최근 24주 (Figma 14786:3572) */
export const GRASS_TAB_WEEKS = 24;
/** 1년 모달 잔디 창 — 53주 (GitHub 연간 그래프 구조, Figma 14789:3834) */
export const GRASS_MODAL_WEEKS = 53;

const DAY_MS = 86_400_000;
const KST_OFFSET_MS = 9 * 3_600_000;

/** KST 기준 오늘 날짜 "YYYY-MM-DD" — 뷰가 파생 함수에 주입하는 실사용 "오늘" */
export const todayKstDate = (nowMs: number = Date.now()): string =>
  new Date(nowMs + KST_OFFSET_MS).toISOString().slice(0, 10);

/** "YYYY-MM-DD" → epoch 일수 (UTC 산술 — TZ 무관) */
const toDayIndex = (date: string): number => {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
};

const fromDayIndex = (dayIndex: number): string =>
  new Date(dayIndex * DAY_MS).toISOString().slice(0, 10);

/** epoch 일수 → 요일 (0=일요일) — epoch 0일(1970-01-01)은 목요일(4) */
const weekdayOf = (dayIndex: number): number => (dayIndex + 4) % 7;

/** 창의 시작 일수 — 오늘이 속한 주의 일요일에서 (weekCount-1)주 전 */
const windowStart = (todayIndex: number, weekCount: number): number =>
  todayIndex - weekdayOf(todayIndex) - (weekCount - 1) * 7;

export interface GrassCell {
  /** KST 날짜 라벨 "YYYY-MM-DD" */
  date: string;
  /** 그날 업로드 수 — 이력에 없는 날은 0 */
  count: number;
}

/** 한 주(열) — index 0=일요일. 마지막 주의 미래 날짜는 null(자리 없음 — A2) */
export type GrassWeek = (GrassCell | null)[];

/** 잔디 격자 파생 — weekCount열×7행, 희소 이력의 빈 날은 0으로 채운다 [AC 4] */
export const buildGrassWeeks = (
  history: UploadHistoryDay[],
  todayKst: string,
  weekCount: number,
): GrassWeek[] => {
  const today = toDayIndex(todayKst);
  const start = windowStart(today, weekCount);
  const counts = new Map(
    history.map((day) => [day.uploadDate, day.uploadCount]),
  );
  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday): GrassCell | null => {
      const dayIndex = start + week * 7 + weekday;
      if (dayIndex > today) return null;
      const date = fromDayIndex(dayIndex);
      return { date, count: counts.get(date) ?? 0 };
    }),
  );
};

/** 5단계 레벨 매핑 — 고정 임계 0/1/2/3/4+ [AC 5, A3] */
export const grassLevel = (count: number): 0 | 1 | 2 | 3 | 4 => {
  if (count <= 0) return 0;
  if (count >= 4) return 4;
  return count as 1 | 2 | 3;
};

export interface MonthLabel {
  /** 라벨이 붙는 열 인덱스 */
  weekIndex: number;
  /** "N월" */
  label: string;
}

/**
 * 월 라벨 파생 — 각 열의 첫 날(일요일)이 이전 열과 다른 달에 진입하는 열 위에
 * 라벨을 단다(첫 열 포함, GitHub 관례). 시안의 4주 간격 균등 배치는 플레이스홀더 —
 * 실제 월 경계 기준이 정본 (스펙 "Figma 오탐 방지").
 */
export const deriveMonthLabels = (weeks: GrassWeek[]): MonthLabel[] => {
  const labels: MonthLabel[] = [];
  let prevMonth = -1;
  weeks.forEach((week, weekIndex) => {
    const sunday = week[0];
    if (sunday === null) return;
    const month = Number(sunday.date.slice(5, 7));
    if (month !== prevMonth) {
      labels.push({ weekIndex, label: `${month}월` });
      prevMonth = month;
    }
  });
  return labels;
};

/** 요일 라벨 — 인덱스 0=일요일 (weekdayOf와 동일 체계) */
const WEEKDAY_LABELS = [
  "일요일",
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
] as const;

export interface GrassSummary {
  /** 창 내 업로드가 있었던 일수 — "N일 업로드" */
  uploadDayCount: number;
  /** 창 내 최장 연속 업로드 일수 — 상단 스트릭 카드(currentStreak: 현재 진행 중)와 다른 지표다 */
  longestStreak: number;
  /** 창 내 하루 최다 업로드 개수 */
  maxDailyCount: number;
  /**
   * 가장 활발한 요일("토요일") — 업로드 '일수' 기준. 동률이면 주 시작(일요일)부터
   * 앞선 요일. 창 내 업로드가 없으면 null(모달 부제에서 해당 조각 생략)
   */
  mostActiveWeekday: string | null;
}

/** 요약 파생 — 탭 메타(24주)·모달 헤드라인/부제(53주)가 같은 함수를 창만 달리해 쓴다 [AC 6] */
export const deriveGrassSummary = (
  history: UploadHistoryDay[],
  todayKst: string,
  weekCount: number,
): GrassSummary => {
  const today = toDayIndex(todayKst);
  const start = windowStart(today, weekCount);
  const days = history
    .map((day) => ({ ...day, dayIndex: toDayIndex(day.uploadDate) }))
    .filter(
      (day) =>
        day.uploadCount > 0 && day.dayIndex >= start && day.dayIndex <= today,
    )
    .sort((a, b) => a.dayIndex - b.dayIndex);

  let longestStreak = 0;
  let run = 0;
  let prevIndex = Number.NaN;
  let maxDailyCount = 0;
  const dayCountPerWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const day of days) {
    run = day.dayIndex === prevIndex + 1 ? run + 1 : 1;
    prevIndex = day.dayIndex;
    if (run > longestStreak) longestStreak = run;
    if (day.uploadCount > maxDailyCount) maxDailyCount = day.uploadCount;
    dayCountPerWeekday[weekdayOf(day.dayIndex)] += 1;
  }

  let mostActiveWeekday: string | null = null;
  let bestDayCount = 0;
  dayCountPerWeekday.forEach((dayCount, weekday) => {
    // 초과 비교라 동률은 앞선(일요일부터) 요일이 유지된다
    if (dayCount > bestDayCount) {
      bestDayCount = dayCount;
      mostActiveWeekday = WEEKDAY_LABELS[weekday];
    }
  });

  return {
    uploadDayCount: days.length,
    longestStreak,
    maxDailyCount,
    mostActiveWeekday,
  };
};
