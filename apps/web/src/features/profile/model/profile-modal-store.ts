import { create } from "zustand";

type ProfileModal = "edit" | "delete";

interface ProfileModalState {
  /** 열린 모달 — null이면 프로필 초기 상태 (MSG-403 AC 16) */
  open: ProfileModal | null;
  openModal: (modal: ProfileModal) => void;
  close: () => void;
}

/**
 * 프로필 모달 상태 (MSG-403 AC 16) — 비영속 인메모리.
 * ProfilePanel의 로컬 useState에서 올린 이유: 사이드레일이 "프로필 탭 재클릭 = 초기 상태로"
 * 를 판정하려면 패널 밖에서 모달 열림 여부를 알아야 한다.
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 */
export const useProfileModalStore = create<ProfileModalState>((set) => ({
  open: null,
  openModal: (modal) => set({ open: modal }),
  close: () => set({ open: null }),
}));
