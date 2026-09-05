import type {
  EventOccurrenceChipResponseDto,
  EventOccurrenceDetailResponseDto,
} from "../../../shared/api/sdk";

/*
 * MSG-557: 웹 `entities/event/model/event.ts` 미러 — 명세 대응 타입을 생성 타입에서
 * type-only 파생한다 (entities/dex 선례). 생성물은 `shared/api/sdk` 배럴 경유(MSG-419).
 */

/** 뷰포트 칩 목록의 회차 상태 — 이 목록에는 두 값만 담긴다 (서버 명세) */
export type EventOccurrenceStatus = EventOccurrenceChipResponseDto["status"];

/** 회차 상세의 상태 — 종료 판정 입력 (UPLOAD_GRACE·ARCHIVED 포함) */
export type EventOccurrenceDetailStatus =
  EventOccurrenceDetailResponseDto["status"];

/** 뷰포트에 걸친 행사 회차 — `GET /api/event-occurrences` 칩 재료 */
export type EventOccurrenceChip = Required<
  Pick<
    EventOccurrenceChipResponseDto,
    "occurrenceId" | "title" | "cityName" | "startsAt" | "endsAt" | "status"
  >
>;
