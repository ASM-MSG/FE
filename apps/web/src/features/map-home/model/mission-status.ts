/**
 * 미션 상태 배지 파생 (MSG-395 AC 4).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * `now`를 주입받는다 — "오늘"이 판정에 들어가므로 호출부가 시각을 소유해야 테스트가
 * 시계에 흔들리지 않는다.
 *
 * 명세의 `startAt`/`endAt`은 타임존 없는 로컬 표기다(entities/cell 리스크 4와 동일 전제) —
 * 달력 일자 비교도 로컬 기준으로 맞춘다.
 */

/** 배지 종별 — 뷰의 색 매핑 키이자 표시 문구의 근거 */
export type MissionStatusKind =
  | "completed"
  | "always"
  | "upcoming"
  | "today"
  | "ongoing"
  | "ended";

export interface MissionStatus {
  kind: MissionStatusKind;
  label: string;
}

interface MissionStatusInput {
  startAt: string | null;
  endAt: string | null;
  /** 내 진행이 목표에 도달했는지 (mission-progress) — 기간보다 우선한다 */
  completed: boolean;
  now: Date;
}

/** 로컬 달력 자정 — 시각 성분을 지운 일자 비교용 */
const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const MS_PER_DAY = 86_400_000;

/**
 * 기간·완료 → 상태 배지. [AC 4]
 * 완료 > 상시 > 시작 전(D-N) > 종료 > 오늘까지 > 진행 중 순으로 판정한다.
 * 시작일이 오늘이면 D-0이 아니라 이미 시작한 것으로 본다.
 */
export const missionStatus = ({
  startAt,
  endAt,
  completed,
  now,
}: MissionStatusInput): MissionStatus => {
  if (completed) return { kind: "completed", label: "완료" };
  if (startAt === null && endAt === null)
    return { kind: "always", label: "상시" };

  const today = startOfDay(now);

  if (startAt !== null) {
    const start = startOfDay(new Date(startAt));
    if (start > today)
      return {
        kind: "upcoming",
        label: `D-${Math.round((start - today) / MS_PER_DAY)}`,
      };
  }

  if (endAt !== null) {
    const end = startOfDay(new Date(endAt));
    if (end < today) return { kind: "ended", label: "종료" };
    if (end === today) return { kind: "today", label: "오늘까지" };
  }

  return { kind: "ongoing", label: "진행 중" };
};
