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
  open: (selection: EventRoomSelection) => void;
  close: () => void;
}

/**
 * 행사방 선택 스토어 (MSG-516 AC 9·10) — 비영속 인메모리, 라우트 없이 홈 패널 상태
 * (추정 5 — 미션/코스 상세 선례). 테마 칩과의 상호 배타(추정 6)는 뷰 레이어가 배선한다 —
 * 스토어 간 교차 feature import를 피한다(theme-filter-store는 features/map-home).
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 */
export const useEventRoomStore = create<EventRoomState>((set) => ({
  room: null,
  open: (selection) => set({ room: selection }),
  close: () => set({ room: null }),
}));
