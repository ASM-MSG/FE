import type { EventOccurrenceDetailStatus } from "../../../entities/event/model/event";
import { dDayLabel } from "./event-chip";

/**
 * 행사 상태 표기 (MSG-557 D7) — 웹 `event-room-mode.ts`의 `isArchivedEventStatus` 포팅
 * + 앱 배지 조립. 순수 함수.
 */

/**
 * 종료 행사 판정 단일 정본 — 제품 "아카이브(종료 후 1개월)"의 주력 상태는 서버
 * UPLOAD_GRACE(종료~+30일)고, ARCHIVED는 "1개월 지난" 상태다. 판정 입력은 서버 status뿐.
 */
export const isArchivedEventStatus = (
  status: EventOccurrenceDetailStatus,
): boolean => status === "UPLOAD_GRACE" || status === "ARCHIVED";

/** 상태 배지 — `upcoming`은 primary 틴트, `archived`는 무채색 (D21) */
export interface EventStatusBadge {
  kind: "upcoming" | "archived";
  label: string;
}

/**
 * `UPCOMING` → `D-n`(당일·경과 `D-0`) · `LIVE` → 표기 없음 · 종료 → `지난 행사 기록`.
 * 종료 회차는 목록 API가 돌려주지 않으므로 열어 둔 개요가 종료로 넘어갈 때만 나타난다.
 */
export const eventStatusBadge = (
  status: EventOccurrenceDetailStatus,
  startsAt: string,
  todayKst: string,
): EventStatusBadge | null => {
  if (status === "UPCOMING")
    return { kind: "upcoming", label: dDayLabel(startsAt, todayKst) };
  if (isArchivedEventStatus(status))
    return { kind: "archived", label: "지난 행사 기록" };
  return null;
};
