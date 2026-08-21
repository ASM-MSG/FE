import { create } from "zustand";

interface SidebarState {
  /** 사이드바 패널 접힘 여부 — true면 패널을 숨기고 지도를 넓게 보여준다(라우트와 무관) */
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
}

/**
 * 사이드바 접힘 상태 — 구글맵식으로, 어느 네비 섹션에 있든 패널을 접어 지도 전체를
 * 볼 수 있게 하는 전역 UI 플래그. 라우트(활성 탭)와 분리해 두므로 접어도 탭은 유지된다.
 */
export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: false,
  setCollapsed: (collapsed) => set({ collapsed }),
  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
}));
