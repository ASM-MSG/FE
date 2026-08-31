import { create } from "zustand";
import type { EventOccurrenceStatus } from "@/entities/event";

/** 열린 행사방 — 칩(세그먼트)에서 받은 최소 참조. 상세 조회는 MSG-517 몫 */
export interface EventRoomSelection {
  occurrenceId: number;
  title: string;
  status: EventOccurrenceStatus;
}

interface EventRoomState {
  /** 열린 행사방 — null이면 닫힘. 세그먼트 활성 표시(AC 9)의 근거 */
  room: EventRoomSelection | null;
  /**
   * 격자 클릭으로 강조된 행사 위치 (MSG-517 AC 7) — null이면 강조 없음.
   * 방 전환·닫힘 시 리셋된다. 위치 "선택"(영상 피드 진입)은 MSG-518 소유 — 이 슬롯은
   * 지도 강조 표시 전용이다.
   */
  highlightedLocationId: number | null;
  open: (selection: EventRoomSelection) => void;
  close: () => void;
  highlightLocation: (locationId: number) => void;
}

/**
 * 행사방 선택 스토어 (MSG-516 AC 9·10) — 비영속 인메모리, 라우트 없이 홈 패널 상태
 * (추정 5 — 미션/코스 상세 선례). 테마 칩과의 상호 배타(추정 6)는 뷰 레이어가 배선한다 —
 * 스토어 간 교차 feature import를 피한다(theme-filter-store는 features/map-home).
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 */
export const useEventRoomStore = create<EventRoomState>((set) => ({
  room: null,
  highlightedLocationId: null,
  // 방 전환 시 이전 방의 강조가 새 방 위치 id와 충돌하지 않게 함께 리셋한다 (MSG-517 AC 7)
  open: (selection) => set({ room: selection, highlightedLocationId: null }),
  close: () => set({ room: null, highlightedLocationId: null }),
  highlightLocation: (locationId) => set({ highlightedLocationId: locationId }),
}));
