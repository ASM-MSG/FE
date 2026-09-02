import type { EventLocationResponseDto } from "../../../shared/api/sdk";

/**
 * 행사 위치 유형 라벨 — 웹 `features/event/model/event-location.ts` 부분 포팅 (MSG-557 D9).
 * 선택 스냅숏·메타 줄·격자 안내·섹션 제목(웹 MSG-518 위치 상세 재료)은 2단계에서 옮긴다.
 */
export type EventLocationType = EventLocationResponseDto["type"];

/** 위치 유형 한글 라벨 — 서버 명세 "표시 라벨 변환은 FE 몫" */
const TYPE_LABELS: Record<EventLocationType, string> = {
  POPUP: "팝업",
  EXPERIENCE_ZONE: "체험존",
  PARADE: "퍼레이드",
  PHOTO_ZONE: "포토존",
  ETC: "기타",
};

export const eventLocationTypeLabel = (type: EventLocationType): string =>
  TYPE_LABELS[type];
