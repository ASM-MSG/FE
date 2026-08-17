import { create } from "zustand";
import { fcmTokenStorage } from "@/shared/storage";

/**
 * FCM 보관 토큰 반응형 스토어 (MSG-408) — 저장 계층은 shared/storage의 fcmTokenStorage.
 * 토글 UI가 보관 변화를 구독해야 해서(등록 성공 → ON 반영) 스토어로 감쌌다.
 * 외부 기록자(features/auth useLogout — shared 매개)는 스토어를 모른 채 보관만 비우므로,
 * 소비자는 마운트 시 refresh로 저장소 실값과 정렬한다.
 */
interface PushTokenState {
  token: string | null;
  /** 등록 성공 토큰 보관 — 저장소와 상태를 함께 갱신 (AC 5) */
  setToken: (token: string) => void;
  /** 해제 — 저장소와 상태를 함께 비움 (AC 7) */
  clearToken: () => void;
  /** 저장소 실값 재판독 — 외부(로그아웃)가 비운 뒤의 스테일 정렬 (AC 9) */
  refresh: () => void;
}

export const usePushTokenStore = create<PushTokenState>()((set) => ({
  token: fcmTokenStorage.get(),
  setToken: (token) => {
    fcmTokenStorage.save(token);
    set({ token });
  },
  clearToken: () => {
    fcmTokenStorage.clear();
    set({ token: null });
  },
  refresh: () => set({ token: fcmTokenStorage.get() }),
}));
