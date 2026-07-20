import { create } from "zustand";

interface UploadModalState {
  /** 업로드 모달 열림 여부 */
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
}

/**
 * 업로드 모달 열림 상태 — 전역 UI 플래그. [Q1]
 * 두 진입점(사이드레일=AppLayout, 지도 FAB=MapShell)이 위젯 경계를 넘어 같은 모달을
 * 열어야 하므로 로컬 state 리프팅 대신 전역 스토어로 둔다(sidebar-store 선례).
 * 라우터를 참조하지 않는다 — 네비게이션이 아니라 오버레이 토글이다(RN 경계).
 */
export const useUploadModalStore = create<UploadModalState>((set) => ({
  open: false,
  openModal: () => set({ open: true }),
  closeModal: () => set({ open: false }),
}));
