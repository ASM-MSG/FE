import { create } from "zustand";
import type { CellVideo } from "@/entities/cell";

/** 미니 패널 선택 — 영상 데이터 + 내 영상 여부(메타 문구 분기 근거) (3차 AC 1) */
export interface VideoMiniSelection {
  video: CellVideo;
  mine: boolean;
}

interface VideoMiniPanelState {
  /** 선택 영상 — null이면 미니 패널 닫힘 (3차 AC 1) */
  selected: VideoMiniSelection | null;
  /** 영상 카드 클릭 — 이미 열린 상태에서 다른 영상이면 교체 (3차 AC 1, 추정 7 — 재클릭도 교체) */
  open: (video: CellVideo, mine: boolean) => void;
  /** 닫기 — 닫기 버튼·컨텍스트 변경(셀 상세 select/close 체인)·Escape 우선 배선의 대상 (3차 AC 2·3) */
  close: () => void;
}

/**
 * 영상 미니 디테일 패널 선택 스토어 (MSG-277 3차 AC 1) — 비영속 인메모리.
 * 좌측 패널(셀 상세 피드·테마 피드 공통)의 영상 카드 클릭이 open을 호출하고,
 * 컨텍스트 닫힘(칩 해제·전환·홈 이탈·셀 상세 닫힘/교체)은 home-cell-detail-store의
 * select·close가 이 스토어의 close를 체인 호출해 함께 닫는다 (3차 AC 2·3).
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 */
export const useVideoMiniPanelStore = create<VideoMiniPanelState>((set) => ({
  selected: null,
  open: (video, mine) => set({ selected: { video, mine } }),
  close: () => set({ selected: null }),
}));
