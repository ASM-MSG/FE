import { create } from "zustand";
import { useVideoMiniPanelStore } from "./video-mini-panel-store";

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
 * MSG-277 3차: select·close가 영상 미니 패널을 체인으로 닫는다(3차 AC 3) —
 * 상세 컨텍스트가 바뀌면 미니 패널 근거가 사라지기 때문. 칩 해제·전환·홈 이탈은
 * theme-filter-store가 close()를 호출하므로 같은 체인으로 미니도 닫힌다 (3차 AC 2,
 * theme-filter→detail cross-store 관례).
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 */
export const useHomeCellDetailStore = create<HomeCellDetailState>((set, get) => ({
  selectedCellId: null,
  select: (cellId) => {
    // 같은 셀 재탭은 컨텍스트 불변 — 미니 패널을 닫을 근거가 없다 (리뷰 반영)
    if (get().selectedCellId === cellId) return;
    useVideoMiniPanelStore.getState().close();
    set({ selectedCellId: cellId });
  },
  close: () => {
    useVideoMiniPanelStore.getState().close();
    set({ selectedCellId: null });
  },
}));
