import type {
  EventOccurrenceChip,
  EventOccurrenceStatus,
} from "../../../entities/event/model/event";
import { eventPeriodLabel } from "./event-overview";
import { eventStatusBadge, type EventStatusBadge } from "./event-status";

/**
 * 행사 목록 카드 뷰 (MSG-557 D6·D7) — 앱 고유. 웹 캡슐 세그먼트(`toEventSegments`)는
 * title(+D-day)만 렌더하지만 앱 카드는 `{cityName} · {M.D–M.D}` 부제를 더 싣는다.
 * 칩 DTO 실필드 6개뿐이라 썸네일·위치 수·영상 수는 없다. 순수 함수.
 */
export interface EventCardView {
  occurrenceId: number;
  title: string;
  status: EventOccurrenceStatus;
  badge: EventStatusBadge | null;
  subtitle: string;
}

/** 칩 목록 → 카드 뷰 — 서버 정렬을 그대로 유지한다 */
export const toEventCardViews = (
  chips: EventOccurrenceChip[],
  todayKst: string,
): EventCardView[] =>
  chips.map((chip) => ({
    occurrenceId: chip.occurrenceId,
    title: chip.title,
    status: chip.status,
    badge: eventStatusBadge(chip.status, chip.startsAt, todayKst),
    subtitle: `${chip.cityName} · ${eventPeriodLabel(chip.startsAt, chip.endsAt)}`,
  }));
