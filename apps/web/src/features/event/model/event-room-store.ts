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
  /**
   * 격자 클릭으로 강조된 행사 위치 (MSG-517 AC 7) — null이면 강조 없음.
   * 방 전환·닫힘 시 리셋된다. 위치 "선택"(영상 피드 진입)은 MSG-518 소유 — 이 슬롯은
   * 지도 강조 표시 전용이다.
   */
  highlightedLocationId: number | null;
  /** 선택된 행사 위치 스냅숏 (MSG-518 AC 1) — null이면 개요. 개요 위치 카드가 배선한다 (MSG-534) */
  location: EventLocationSelection | null;
  /**
   * 선택된 행사 영상 id (MSG-520 AC 1) — null이면 미니 패널 닫힘. 상세(재생 URL·
   * 메타·helpful·댓글)는 getVideoDetail이 한 번에 돌려주므로 id만 담는다.
   * 방·위치 수명에 종속 — 위치 해제·교체·방 닫힘이 함께 비운다.
   */
  videoId: number | null;
  open: (selection: EventRoomSelection) => void;
  close: () => void;
  highlightLocation: (locationId: number) => void;
  selectLocation: (location: EventLocationSelection) => void;
  clearLocation: () => void;
  selectVideo: (videoId: number) => void;
  closeVideo: () => void;
  /**
   * 뒤로가기 3단 (MSG-518 AC 12 → MSG-520 AC 3) — 영상이 열려 있으면 영상만 닫고,
   * 아니면 위치 해제, 아니면 방을 닫는다.
   */
  back: () => void;
}

/**
 * 행사방 선택 스토어 (MSG-516 AC 9·10 → MSG-517 강조·MSG-518 위치 확장) — 비영속
 * 인메모리, 라우트 없이 홈 패널 상태(추정 5 — 미션/코스 상세 선례)라 섹션 이탈 후 복귀에도
 * 세션 동안 유지된다 (MSG-518 AC 11). 테마 칩과의 상호 배타(추정 6)는 뷰 레이어가
 * 배선한다 — 스토어 간 교차 feature import를 피한다(theme-filter-store는 features/map-home).
 * 위치 리셋 규칙 (MSG-518 AC 1 — 유령 위치 방지): close()와 **다른 행사** open()이
 * 위치를 함께 비운다. 같은 행사 재open(활성 세그먼트 재클릭)은 보던 위치를 유지한다.
 * 강조(highlightedLocationId)는 표시 전용이라 어떤 open이든 리셋한다 (MSG-517 AC 7 —
 * 방 전환 시 이전 방의 강조가 새 방 위치 id와 충돌하지 않게).
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 */
export const useEventRoomStore = create<EventRoomState>((set) => ({
  room: null,
  highlightedLocationId: null,
  location: null,
  videoId: null,
  open: (selection) =>
    set((state) => {
      const sameRoom = state.room?.occurrenceId === selection.occurrenceId;
      return {
        room: selection,
        highlightedLocationId: null,
        // 같은 행사 재open(활성 세그먼트 재클릭)은 보던 위치·영상을 유지한다
        location: sameRoom ? state.location : null,
        videoId: sameRoom ? state.videoId : null,
      };
    }),
  close: () =>
    set({
      room: null,
      highlightedLocationId: null,
      location: null,
      videoId: null,
    }),
  highlightLocation: (locationId) => set({ highlightedLocationId: locationId }),
  // 위치 교체는 이전 위치의 영상을 함께 해제한다 (MSG-520 — 유령 영상 방지)
  selectLocation: (location) => set({ location, videoId: null }),
  clearLocation: () => set({ location: null, videoId: null }),
  selectVideo: (videoId) => set({ videoId }),
  closeVideo: () => set({ videoId: null }),
  back: () =>
    set((state) => {
      if (state.videoId !== null) return { videoId: null };
      if (state.location !== null) return { location: null };
      return {
        room: null,
        highlightedLocationId: null,
        location: null,
        videoId: null,
      };
    }),
}));
