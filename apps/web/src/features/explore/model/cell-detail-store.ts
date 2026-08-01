import { create } from "zustand";
import type { Cell } from "@/entities/cell";

interface CellDetailState {
  /** 상세 시트에 열린 격자 id — null이면 시트 닫힘 (목록만 표시) */
  selectedCellId: string | null;
  /** 상단 대표 영상 영역에 표시 중인 영상 id — 선택 시 대표 영상(videos[0])으로 초기화 */
  activeVideoId: number | null;
  /** 격자를 선택해 상세 시트를 연다. videoCount === 0이면 no-op (AC 2). 다른 격자로 전환할 때만 activeVideoId를 대표 영상으로 리셋한다 (AC 20) — 이미 열린 같은 격자를 재클릭하면 no-op이라 선택해둔 영상이 유지된다. */
  select: (cell: Cell) => void;
  /** 리스트 영상을 대표 영상 영역에 반영한다 — 실제 재생 트리거 없음 (AC 17). */
  selectVideo: (videoId: number) => void;
  /** 상세 시트를 닫는다 — selectedCellId=null (AC 4). */
  close: () => void;
}

/**
 * 격자 상세 선택 스토어 (비영속 인메모리) — 열린 격자·대표 영상 상태만 보관한다.
 * 검색·지역 필터 스토어(MSG-114)와 분리되어 있어, 필터 변경이 선택을 해제하지 않는다 (AC 8).
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 */
export const useCellDetailStore = create<CellDetailState>((set) => ({
  selectedCellId: null,
  activeVideoId: null,
  select: (cell) => {
    if (cell.videoCount === 0) return;
    set((state) => {
      if (state.selectedCellId === cell.id) return state;
      return { selectedCellId: cell.id, activeVideoId: cell.videos[0]?.videoId ?? null };
    });
  },
  selectVideo: (videoId) => set({ activeVideoId: videoId }),
  close: () => set({ selectedCellId: null, activeVideoId: null }),
}));
