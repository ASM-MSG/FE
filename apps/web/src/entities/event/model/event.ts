import type {
  EventOccurrenceChipResponseDto,
  EventOccurrenceDetailResponseDto,
} from "@/shared/api/generated/types.gen";

/*
 * MSG-516: 명세 대응 필드는 생성 타입(shared/api/generated)에서 type-only 파생한다
 * (entities/dex 선례). Required 승격은 명세가 optional로 회귀해도 화면 계약을 지키는
 * 안전망이며, 명세 필드명 변경·제거는 이 Pick이 typecheck로 잡는다.
 */

/** 뷰포트 칩 목록의 회차 상태 — 이 목록에는 두 값만 담긴다 (서버 명세) */
export type EventOccurrenceStatus = EventOccurrenceChipResponseDto["status"];

/** 회차 상세의 상태 — 행사방 모드 판정 입력 (UPLOAD_GRACE·ARCHIVED 포함, MSG-517~519 재료) */
export type EventOccurrenceDetailStatus =
  EventOccurrenceDetailResponseDto["status"];

/**
 * 뷰포트에 걸친 행사 회차 — 지도 홈 행사 캡슐 재료.
 * `GET /api/event-occurrences` (MSG-516 AC 7).
 */
export type EventOccurrenceChip = Required<
  Pick<
    EventOccurrenceChipResponseDto,
    "occurrenceId" | "title" | "cityName" | "startsAt" | "endsAt" | "status"
  >
>;
