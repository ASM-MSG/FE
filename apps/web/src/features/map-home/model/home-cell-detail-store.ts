import { create } from "zustand";

interface HomeCellDetailState {
  /** 상세로 전환된 셀 id — null이면 기본 패널(요약) 표시 (AC 2·9) */
  selectedCellId: string | null;
  /** 셀 상세를 연다 — 이미 열린 상태에서 다른 셀이면 교체 (AC 9-1, A3) */
  select: (cellId: string) => void;
  /** 상세를 닫고 기본 패널로 복귀 — 칩 해제·전환·Escape 배선의 대상 (AC 9-1) */
  close: () => void;
}

/**
 * 홈 셀 상세 선택 스토어 (MSG-252 AC 9·9-1·10) — 비영속 인메모리.
 * 열 수 있는 셀인지의 판정(canOpenDetail)은 순수 함수가 담당하고 스토어는 상태만 보관한다.
 * 탐색의 cell-detail-store와 분리 — 홈 상세는 좌측 패널 전환(별도 UI·닫힘 규칙)이라 계약이 다르다.
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 */
export const useHomeCellDetailStore = create<HomeCellDetailState>((set) => ({
  selectedCellId: null,
  select: (cellId) => set({ selectedCellId: cellId }),
  close: () => set({ selectedCellId: null }),
}));
