import type {
  EventOccurrenceChip,
  EventOccurrenceStatus,
} from "@/entities/event";

/**
 * 행사 캡슐 파생 (MSG-516 AC 4·6) — 지역명 시 축약 + D-day + 세그먼트 뷰.
 * 순수 함수 — 플랫폼 무의존, RN 재사용 대상.
 *
 * KST 안전 날짜 산술: 날짜를 epoch 일수 정수(Date.UTC 산술)로 바꿔 계산한다 —
 * 실행 환경 TZ 무관 결정적 (dex `upload-grass` 선례). "오늘"은 호출자가 주입한다
 * (테스트 결정성) — 실사용 진입점은 todayKstDate().
 */

export const DAY_MS = 86_400_000;
export const KST_OFFSET_MS = 9 * 3_600_000;

/** KST 기준 오늘 날짜 "YYYY-MM-DD" — 뷰가 파생 함수에 주입하는 실사용 "오늘" */
export const todayKstDate = (nowMs: number = Date.now()): string =>
  new Date(nowMs + KST_OFFSET_MS).toISOString().slice(0, 10);

/** "YYYY-MM-DD" → epoch 일수 (UTC 산술 — TZ 무관) */
const toDayIndex = (date: string): number => {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
};

/**
 * date-time 문자열의 KST 날짜부 "YYYY-MM-DD".
 * 오프셋이 없으면(서버 LocalDateTime 직렬화) 문자열 자체가 KST 벽시계라 날짜부를 그대로
 * 읽고, Z·±hh:mm 오프셋이 있으면 epoch로 환산 후 +9h를 더해 KST 날짜를 얻는다.
 * MSG-517: 기간 라벨(event-overview)이 같은 규칙을 쓰게 되어 export로 공유한다.
 */
export const kstDateOf = (dateTime: string): string => {
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(dateTime);
  if (!hasOffset) return dateTime.slice(0, 10);
  return new Date(Date.parse(dateTime) + KST_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
};

/** 시도 접미 축약 대상 — 긴 접미부터 검사한다("특별자치시"가 "광역시"보다 먼저) */
const SIDO_SUFFIXES = ["특별자치시", "특별자치도", "광역시", "특별시"] as const;

/**
 * 역지오코딩 전체 경로("부산광역시 부산진구 부전2동")의 시 단위 축약 (AC 4, 추정 1).
 * 첫 토큰(시도명)만 취해 접미 제거 + 도명은 관용 축약(4자 "경상남도"→"경남",
 * 3자 "경기도"→"경기") — 저줌 집계 마커의 시도 축약 규칙(region-cluster-overlay,
 * MSG-410 명세 "클라이언트 몫")과 동일 규칙이다.
 * 미도착·행정동 밖(null·빈 문자열)은 null — 캡슐 미렌더 판정 재료.
 */
export const cityLabel = (regionName: string | null): string | null => {
  const sido = regionName?.trim().split(/\s+/)[0];
  if (!sido) return null;
  for (const suffix of SIDO_SUFFIXES) {
    if (sido.endsWith(suffix) && sido.length > suffix.length) {
      return sido.slice(0, sido.length - suffix.length);
    }
  }
  if (sido.endsWith("도")) {
    if (sido.length === 4) return `${sido[0]}${sido[2]}`;
    if (sido.length === 3) return sido.slice(0, 2);
  }
  return sido;
};

/**
 * startsAt 기준 D-day 라벨 (AC 6) — 서버 명세가 "클라이언트 계산"으로 지시.
 * 당일·경과는 "D-0"으로 통일한다 (추정 8 — 음수 D-day 금지).
 */
export const dDayLabel = (startsAt: string, todayKst: string): string => {
  const days = toDayIndex(kstDateOf(startsAt)) - toDayIndex(todayKst);
  return `D-${Math.max(days, 0)}`;
};

/** 캡슐 세그먼트 하나의 뷰 재료 — 라벨은 `title` (+ UPCOMING이면 D-day) */
export interface EventSegmentView {
  occurrenceId: number;
  title: string;
  status: EventOccurrenceStatus;
  /** UPCOMING이면 "D-n", LIVE면 null — 진행 중 행사는 D-day를 표기하지 않는다 (추정 8) */
  dDay: string | null;
}

/** 칩 목록 → 세그먼트 뷰 (AC 6) — 서버 정렬(시이름→시작일→id)을 그대로 유지한다 */
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
