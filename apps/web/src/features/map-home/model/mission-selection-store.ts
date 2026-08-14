import { create } from "zustand";

interface MissionSelectionState {
  /** 선택된 미션·코스 id — null이면 목록 화면 (AC 6·7) */
  selectedMissionId: number | null;
  /** 마우스가 올라간 카드의 미션 id — 지도 강조·라벨 마커의 근거 (AC 16) */
  hoveredMissionId: number | null;
  select: (missionId: number) => void;
  clear: () => void;
  hover: (missionId: number | null) => void;
  reset: () => void;
}

/**
 * 미션·코스 선택 스토어 (MSG-395 AC 6·16) — 비영속 인메모리.
 * 격자 선택은 기존 `home-cell-detail-store`가 계속 소유한다 — 여기 두면 같은 선택이
 * 두 스토어에 갈라져 패널 분기(panel-branch)가 어느 쪽을 봐야 할지 모호해진다.
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 *
 * 칩 전환·홈 이탈 시의 초기화는 `theme-filter-store`가 호출한다 (기존 셀 상세 연동 관례).
 */
export const useMissionSelectionStore = create<MissionSelectionState>(
  (set) => ({
    selectedMissionId: null,
    hoveredMissionId: null,
    select: (missionId) => set({ selectedMissionId: missionId }),
    clear: () => set({ selectedMissionId: null }),
    hover: (missionId) => set({ hoveredMissionId: missionId }),
    reset: () => set({ selectedMissionId: null, hoveredMissionId: null }),
  }),
);
