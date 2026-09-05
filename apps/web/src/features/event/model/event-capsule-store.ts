import { create } from "zustand";
import { useEventRoomStore } from "./event-room-store";

interface EventCapsuleState {
  /** 캡슐 펼침 여부 — 기본 접힘 (AC 3·5) */
  expanded: boolean;
  expand: () => void;
  /** 접힘(✕) — 열려 있던 행사방도 함께 닫는다 (AC 10) */
  collapse: () => void;
  /**
   * 캡슐만 접고 행사방은 유지 — 시 경계 전환 같은 **비명시 문맥 리셋** 전용 (PR 리뷰 반영).
   * 패널은 지도 이동으로 닫지 않는 관례(격자·미션·코스 상세 동일) — 방 닫힘 체인은
   * 사용자 명시 액션(✕ = collapse)에만 건다.
   */
  collapseOnly: () => void;
}

/**
 * 행사 캡슐 펼침/접힘 스토어 (MSG-516 AC 5·10) — 비영속 인메모리.
 * collapse가 행사방을 함께 닫는 이유: ✕는 "행사 화면 전체를 걷는" 동작이라(AC 10)
 * 캡슐만 접히고 방이 남으면 활성 근거 없는 유령 패널이 된다 (theme-filter-store가
 * 셀 상세를 체인으로 닫는 기존 관례).
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 */
export const useEventCapsuleStore = create<EventCapsuleState>((set) => ({
  expanded: false,
  expand: () => set({ expanded: true }),
  collapse: () => {
    useEventRoomStore.getState().close();
    set({ expanded: false });
  },
  collapseOnly: () => set({ expanded: false }),
}));
