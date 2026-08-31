import type { EventOccurrenceDetailStatus } from "@/entities/event";

/** 행사방 본문 모드 — MSG-517(overview)·MSG-518(videos·empty)·MSG-519(archive)가 채운다 */
export type EventRoomMode = "overview" | "videos" | "empty" | "archive";

export interface EventRoomModeInput {
  /** 회차 상태 — 정본은 상세 status 4값(상세 도착 전엔 칩 2값 폴백, MSG-519 질문 3) */
  status: EventOccurrenceDetailStatus;
  /** 선택된 행사 위치 — MSG-518이 위치 선택 시 채우는 입력 슬롯. 미선택이면 개요 */
  selectedLocationId?: number | null;
  /** 선택 위치의 영상 존재 여부 — MSG-518 빈 상태 분기 입력 슬롯 */
  hasLocationVideos?: boolean;
}

/**
 * 행사방 본문 모드 판정 (MSG-516 AC 11) — 순수 함수, RN 재사용 대상.
 * 분기 구조는 여기 한 곳에 모으고 렌더는 EventRoomBodySwitch가 맡는다
 * (MSG-427/428 확장점 패턴). 현재 입력(칩 status 2값·위치 미선택)으로는 overview 고정.
 */
export const eventRoomMode = ({
  status,
  selectedLocationId,
  hasLocationVideos,
}: EventRoomModeInput): EventRoomMode => {
  // 종료 행사는 위치 선택이 남아 있어도 아카이브다 — 유령 영상 목록 방지 (MSG-519 AC 1·2).
  // 명명 함정: 제품 "아카이브(종료 후 1개월)"의 주력 상태는 서버 UPLOAD_GRACE(종료~+30일)고,
  // 서버 ARCHIVED는 "1개월 지난" 상태다 — 잔여 경로(지난 회차 클릭) 도달 시 그대로 아카이브(질문 2 A안).
  // 판정 입력은 서버 status뿐 — FE 날짜 계산 0줄 (질문 1 승인, AC 8)
  if (status === "UPLOAD_GRACE" || status === "ARCHIVED") return "archive";
  if (selectedLocationId != null) {
    return hasLocationVideos ? "videos" : "empty";
  }
  return "overview";
};
