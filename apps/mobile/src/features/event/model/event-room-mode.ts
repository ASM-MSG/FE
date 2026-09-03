import type { EventOccurrenceDetailStatus } from "../../../entities/event/model/event";
import { isArchivedEventStatus } from "./event-status";

/**
 * 행사방 본문 모드 판정 (MSG-560 D7) — 웹 `features/event/model/event-room-mode.ts` 포팅.
 * 앱에서 `archive`와 `overview`는 같은 개요 시트로 렌더된다(557 D7의 배지·연도 기간이
 * 이미 종료를 표현) — 판정만 웹과 동등하게 유지해 readOnly·후속 아카이브 본문의 근거로 쓴다.
 * `isArchivedEventStatus`는 557 `event-status.ts`가 정본이라 여기서 재정의하지 않는다.
 */
export type EventRoomMode = "overview" | "videos" | "empty" | "archive";

export interface EventRoomModeInput {
  /** 회차 상태 — 정본은 상세 status 4값 */
  status: EventOccurrenceDetailStatus;
  /** 선택된 행사 위치 — 미선택이면 개요 */
  selectedLocationId?: number | null;
  /** 선택 위치의 영상 존재 여부 — 빈 상태 분기 입력 */
  hasLocationVideos?: boolean;
}

export const eventRoomMode = ({
  status,
  selectedLocationId,
  hasLocationVideos,
}: EventRoomModeInput): EventRoomMode => {
  // 위치 선택이 status보다 먼저다 — 종료 행사도 위치를 고르면 videos/empty로 열람하고,
  // 읽기 전용 표현은 소비처의 readOnly가 맡는다 (D8). 아카이브 첫 화면이 개요인 보장은
  // 선택 상태가 진다: 다른 행사 open이 위치를 리셋한다 (D1).
  if (selectedLocationId != null) {
    return hasLocationVideos ? "videos" : "empty";
  }
  return isArchivedEventStatus(status) ? "archive" : "overview";
};
