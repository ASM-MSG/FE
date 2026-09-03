import { useSyncExternalStore } from "react";
import type {
  PendingVideo,
  PendingVideoStorage,
} from "./pending-video-storage";

/**
 * 처리 대기 스토어 (MSG-429 기준 8) — 영속 목록(`pending-video-storage`)을 미러링하는
 * 반응형 상태. 확정 성공(`settleUploadSuccess`)이 `track`하면 루트 상주 워처가 이 구독으로
 * 즉시 폴링을 시작하고, 앱 재진입 시 `hydrate`로 복원한다. 웹 MSG-329 `processing-store`
 * 대응이지만 **zustand가 아니다** — apps/mobile에 zustand가 없어 모듈 스코프 팩토리 +
 * `useSyncExternalStore` 관례를 따른다(`search-store`·`upload-flow-store` 선례).
 *
 * 저장소는 주입받는다 — 네이티브 모듈을 모델에 들이지 않기 위해서다. 실제 배선은
 * `processing-persistence.ts`가 한다.
 */
export interface ProcessingStore {
  /** 스냅숏 — 변화가 없으면 **같은 참조**를 돌려준다(useSyncExternalStore 계약) */
  getPending: () => PendingVideo[];
  subscribe: (listener: () => void) => () => void;
  /** 저장소 → 상태 복원 (앱 재진입·포그라운드 복귀) */
  hydrate: () => Promise<void>;
  /** 확정 성공 직후 대기 등록 */
  track: (videoId: number, startedAtMs: number) => Promise<void>;
  /** READY/FAILED/만료 처리 후 제거 */
  untrack: (videoId: number) => Promise<void>;
  /** 세션 종료 시 전부 제거 (MSG-561) — 대기 목록은 기기 전역 키라 계정을 넘어 재개되면 안 된다 */
  clear: () => Promise<void>;
}

const sameList = (a: PendingVideo[], b: PendingVideo[]): boolean =>
  a.length === b.length &&
  a.every(
    (item, index) =>
      item.videoId === b[index].videoId &&
      item.startedAtMs === b[index].startedAtMs,
  );

export const createProcessingStore = (
  storage: PendingVideoStorage,
): ProcessingStore => {
  let pending: PendingVideo[] = [];
  const listeners = new Set<() => void>();

  /**
   * 값이 실제로 달라졌을 때만 참조를 교체하고 통지한다. 없는 항목의 `untrack`이나
   * 재수화가 매번 새 배열을 만들면 `useSyncExternalStore`가 렌더를 계속 돌린다.
   */
  const setPending = (next: PendingVideo[]) => {
    if (sameList(pending, next)) return;
    pending = next;
    listeners.forEach((listener) => listener());
  };

  return {
    getPending: () => pending,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hydrate: async () => setPending(await storage.list()),
    track: async (videoId, startedAtMs) =>
      setPending(await storage.add({ videoId, startedAtMs })),
    untrack: async (videoId) => setPending(await storage.remove(videoId)),
    clear: async () => setPending(await storage.clear()),
  };
};

/** 대기 목록 구독 훅 — 워처가 목록 변화를 즉시 받아 폴링을 붙이고 뗀다 */
export const usePendingVideos = (store: ProcessingStore): PendingVideo[] =>
  useSyncExternalStore(store.subscribe, store.getPending, store.getPending);
