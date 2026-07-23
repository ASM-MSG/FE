import { create } from "zustand";

interface LoginModalState {
  /** 로그인 모달 열림 여부 */
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
}

/**
 * 로그인 모달 열림 상태 (MSG-46 후속 2 G1·G6) — 전역 UI 플래그.
 * 진입점(SideRailNav)과 마운트 위치(AppLayout)가 위젯 경계를 넘어 같은 모달을
 * 다뤄야 하므로 전역 스토어로 둔다(upload-modal-store 관례).
 * 라우터를 참조하지 않는다 — 네비게이션이 아니라 오버레이 토글이다(RN 경계).
 */
export const useLoginModalStore = create<LoginModalState>((set) => ({
  open: false,
  openModal: () => set({ open: true }),
  closeModal: () => set({ open: false }),
}));
