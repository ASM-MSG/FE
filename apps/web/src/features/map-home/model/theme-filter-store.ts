import { create } from "zustand";
import { useHomeCellDetailStore } from "./home-cell-detail-store";
import { useMissionSelectionStore } from "./mission-selection-store";
import type { ThemeId } from "./theme";

interface ThemeFilterState {
  /** 활성 테마 — 단일 선택, null이면 기본 상태 (AC 2·4) */
  activeTheme: ThemeId | null;
  /** 칩 탭 — 같은 테마 재탭이면 해제, 다른 테마면 전환 (AC 4·5) */
  toggle: (theme: ThemeId) => void;
  /** 홈 이탈 시 기본 상태로 초기화 — 칩 해제 + 열린 셀 상세 닫힘 (AC 14) */
  reset: () => void;
}

/**
 * 테마 칩 필터 스토어 (MSG-252 AC 4·5) — 비영속 인메모리.
 * toggle은 어떤 경우든 activeTheme이 바뀌므로 열려 있던 셀 상세를 함께 닫는다 (AC 9-1, A3) —
 * 배지·영상 목록이 활성 테마에서 파생되어(AC 9·10) 상세를 유지하면 표시 기준이 어긋난다.
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 */
export const useThemeFilterStore = create<ThemeFilterState>((set) => ({
  activeTheme: null,
  toggle: (theme) => {
    useHomeCellDetailStore.getState().close();
    // MSG-395: 칩이 바뀌면 그 칩의 미션 목록도 통째로 바뀐다 — 이전 칩에서 고른 미션이
    // 남아 있으면 새 목록에 없는 미션의 상세가 열린 채로 보인다
    useMissionSelectionStore.getState().reset();
    set((s) => ({ activeTheme: s.activeTheme === theme ? null : theme }));
  },
  // 사이드레일로 다른 섹션에 다녀오면 칩·상세가 남지 않도록 홈 언마운트 시 호출된다 (AC 14).
  // 칩 없이 열린 점령 셀 상세(AC 10)도 함께 닫아 복귀 화면을 기본 상태로 보장한다
  reset: () => {
    useHomeCellDetailStore.getState().close();
    useMissionSelectionStore.getState().reset();
    set({ activeTheme: null });
  },
}));
