import { create } from "zustand";

/** 토글 조작 안내 종류 — denied(브라우저 설정 안내) · error(등록/해제 실패) */
export type PushToggleNotice = "denied" | "error";

/**
 * 푸시 안내 스토어 (PR #60 리뷰 3) — 토글 훅(use-push-toggle)이 안내를 push하고
 * PushNoticeHost가 포그라운드 수신과 **한 스택**으로 렌더한다. ProfilePanel의 자체
 * 토스트 컨테이너가 호스트와 같은 fixed 좌표(bottom-md right-md z-50)를 써서 동시
 * 표시 시 겹치던 문제의 해소 — 알림 표시 표면을 notifications 도메인 안에서 단일화한다.
 * 마지막 안내만 유효(단일 슬롯) — 동시 다중 안내 요구 없음 (push-token-store 전례의 경량 스토어).
 */
interface PushNoticeState {
  toggleNotice: PushToggleNotice | null;
  showToggleNotice: (notice: PushToggleNotice) => void;
  dismissToggleNotice: () => void;
}

export const usePushNoticeStore = create<PushNoticeState>()((set) => ({
  toggleNotice: null,
  showToggleNotice: (notice) => set({ toggleNotice: notice }),
  dismissToggleNotice: () => set({ toggleNotice: null }),
}));
