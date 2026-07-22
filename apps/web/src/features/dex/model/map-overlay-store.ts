import { create } from "zustand";
import type { CellOverlay } from "./cell-overlay";

interface MapOverlayState {
  /** 지도에 게시된 수집 오버레이 — 비어 있으면 지도는 기존 동작 그대로다(R3) */
  cells: CellOverlay[];
  setCells: (cells: CellOverlay[]) => void;
  clear: () => void;
}

/**
 * 수집 오버레이 게시 스토어 (AC 9·11).
 * 도감 패널(지도 탭)이 마운트 시 set, 이탈 시 clear하고, MapShell이 구독해
 * MapCanvas에 순수 데이터(id+Bounds)로 전달한다 — 지도 SDK를 import하지 않는다(RN 경계).
 * 위젯 경계(pages/dex ↔ widgets/map-shell)를 넘는 전달이라 전역 스토어로 둔다(viewport-store 선례).
 */
export const useMapOverlayStore = create<MapOverlayState>((set) => ({
  cells: [],
  setCells: (cells) => set({ cells }),
  clear: () => set({ cells: [] }),
}));
