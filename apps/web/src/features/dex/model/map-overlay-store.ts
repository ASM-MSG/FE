import { create } from "zustand";
import type { CellOverlay } from "./cell-overlay";

interface MapOverlayState {
  /** 지도에 게시된 수집 오버레이 — 비어 있으면 지도는 기존 동작 그대로다(R3) */
  cells: CellOverlay[];
  /**
   * 오버레이 셀 클릭 핸들러 (MSG-122 AC 14·18) — null이면 표시 전용(MSG-121 기존 동작, R3).
   * 게시자는 DexPanel(지도·갤러리 탭), 소비자는 MapShell → MapCanvas Polygon onClick.
   */
  onCellClick: ((cellId: string) => void) | null;
  setCells: (cells: CellOverlay[]) => void;
  setOnCellClick: (handler: ((cellId: string) => void) | null) => void;
  clear: () => void;
}

/**
 * 수집 오버레이 게시 스토어 (AC 9·11).
 * 도감 패널(지도·갤러리 탭 — MSG-122 A3)이 마운트 시 set, 이탈 시 clear하고, MapShell이 구독해
 * MapCanvas에 순수 데이터(id+Bounds)와 클릭 핸들러로 전달한다 — 지도 SDK를 import하지 않는다(RN 경계).
 * 위젯 경계(pages/dex ↔ widgets/map-shell)를 넘는 전달이라 전역 스토어로 둔다(viewport-store 선례).
 * clear는 오버레이와 핸들러를 함께 해제한다 — 도감 밖 섹션(홈·탐색)은 항상 표시 전용·무오버레이다.
 */
export const useMapOverlayStore = create<MapOverlayState>((set) => ({
  cells: [],
  onCellClick: null,
  setCells: (cells) => set({ cells }),
  setOnCellClick: (handler) => set({ onCellClick: handler }),
  clear: () => set({ cells: [], onCellClick: null }),
}));
