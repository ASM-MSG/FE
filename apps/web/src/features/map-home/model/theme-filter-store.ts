import { create } from "zustand";
import { useHomeCellDetailStore } from "./home-cell-detail-store";
import type { ThemeId } from "./theme";

interface ThemeFilterState {
  /** 활성 테마 — 단일 선택, null이면 기본 상태 (AC 2·4) */
  activeTheme: ThemeId | null;
  /** 칩 탭 — 같은 테마 재탭이면 해제, 다른 테마면 전환 (AC 4·5) */
  toggle: (theme: ThemeId) => void;
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
    set((s) => ({ activeTheme: s.activeTheme === theme ? null : theme }));
  },
}));
