import { create } from "zustand";
import { pendingVideoStorage, type PendingVideo } from "@/shared/storage";

/**
 * 처리 대기 스토어 (MSG-329 B15) — pendingVideoStorage(shared 어댑터)를 정본으로
 * 미러링하는 전역 상태. 같은 탭에서 확정(track)이 일어나면 AppLayout 상주 워처가
 * 이 스토어 구독으로 즉시 폴링을 시작하고, 재진입 시 hydrate로 복원한다.
 * localStorage 직접 참조 없음(어댑터 경유 — RN 경계), 라우터 무의존.
 */
interface ProcessingState {
  pending: PendingVideo[];
  /** 스토리지 → 상태 복원 — 워처 마운트(앱 재진입) 시 1회 */
  hydrate: () => void;
  /** 확정 성공 직후 대기 등록 — 스토리지 기록 + 상태 반영 */
  track: (videoId: number, startedAtMs: number) => void;
  /** READY/FAILED/만료 처리 후 제거 */
  untrack: (videoId: number) => void;
}

export const useProcessingStore = create<ProcessingState>((set) => ({
  pending: [],
  hydrate: () => set({ pending: pendingVideoStorage.list() }),
  track: (videoId, startedAtMs) => {
    pendingVideoStorage.add({ videoId, startedAtMs });
    set({ pending: pendingVideoStorage.list() });
  },
  untrack: (videoId) => {
    pendingVideoStorage.remove(videoId);
    set({ pending: pendingVideoStorage.list() });
  },
}));
