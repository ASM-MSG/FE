import { create } from "zustand";
import type { EventOccurrenceStatus } from "@/entities/event";
import type { EventLocationSelection } from "./event-location";

/** 열린 행사방 — 칩(세그먼트)에서 받은 최소 참조. 상세 조회는 MSG-517 몫 */
export interface EventRoomSelection {
  occurrenceId: number;
  title: string;
  status: EventOccurrenceStatus;
}

interface EventRoomState {
  /** 열린 행사방 — null이면 닫힘. 세그먼트 활성 표시(AC 9)의 근거 */
  room: EventRoomSelection | null;
  /** 선택된 행사 위치 스냅숏 (MSG-518 AC 1) — null이면 개요. 클릭 배선은 MSG-517 몫 */
  location: EventLocationSelection | null;
  open: (selection: EventRoomSelection) => void;
  close: () => void;
  selectLocation: (location: EventLocationSelection) => void;
  clearLocation: () => void;
  /** 뒤로가기 2단 (MSG-518 AC 12) — 위치 선택 중이면 위치만 해제, 아니면 방을 닫는다 */
  back: () => void;
}

/**
 * 행사방 선택 스토어 (MSG-516 AC 9·10 → MSG-518 위치 확장) — 비영속 인메모리,
 * 라우트 없이 홈 패널 상태(추정 5 — 미션/코스 상세 선례)라 섹션 이탈 후 복귀에도
 * 세션 동안 유지된다 (MSG-518 AC 11). 테마 칩과의 상호 배타(추정 6)는 뷰 레이어가
 * 배선한다 — 스토어 간 교차 feature import를 피한다(theme-filter-store는 features/map-home).
 * 위치 리셋 규칙 (MSG-518 AC 1 — 유령 위치 방지): close()와 **다른 행사** open()이
 * 위치를 함께 비운다. 같은 행사 재open(활성 세그먼트 재클릭)은 보던 위치를 유지한다.
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 */
export const useEventRoomStore = create<EventRoomState>((set) => ({
  room: null,
  location: null,
  open: (selection) =>
    set((state) => ({
      room: selection,
      location:
        state.room?.occurrenceId === selection.occurrenceId
          ? state.location
          : null,
    })),
  close: () => set({ room: null, location: null }),
  selectLocation: (location) => set({ location }),
  clearLocation: () => set({ location: null }),
  back: () =>
    set((state) =>
      state.location !== null
        ? { location: null }
        : { room: null, location: null },
    ),
}));
