import { describe, expect, it, vi } from "vitest";
import { createPendingVideoStorage } from "./pending-video-storage";
import { createProcessingStore } from "./processing-store";
import type { KeyValueStorage } from "./upload-flow-storage";

const memoryStorage = (initial?: string): KeyValueStorage => {
  const cells = new Map<string, string>();
  if (initial !== undefined) cells.set("fillmap.upload.pending", initial);
  return {
    getItem: async (key) => cells.get(key) ?? null,
    setItem: async (key, value) => {
      cells.set(key, value);
    },
    removeItem: async (key) => {
      cells.delete(key);
    },
  };
};

const storeOn = (initial?: string) =>
  createProcessingStore(createPendingVideoStorage(memoryStorage(initial)));

describe("processing-store — 대기 목록 반응형 스토어 (기준 8)", () => {
  it("초기 상태는 빈 목록이고, hydrate로 저장값을 복원한다", async () => {
    const store = storeOn(JSON.stringify([{ videoId: 5, startedAtMs: 100 }]));
    expect(store.getPending()).toEqual([]);

    await store.hydrate();
    expect(store.getPending()).toEqual([{ videoId: 5, startedAtMs: 100 }]);
  });

  it("track은 상태와 저장소 양쪽에 남는다 — 새 스토어가 같은 값을 복원한다", async () => {
    const shared = memoryStorage();
    const store = createProcessingStore(createPendingVideoStorage(shared));

    await store.track(7, 42);
    expect(store.getPending()).toEqual([{ videoId: 7, startedAtMs: 42 }]);

    const restarted = createProcessingStore(createPendingVideoStorage(shared));
    await restarted.hydrate();
    expect(restarted.getPending()).toEqual([{ videoId: 7, startedAtMs: 42 }]);
  });

  it("untrack은 해당 항목만 제거한다", async () => {
    const store = storeOn();
    await store.track(1, 10);
    await store.track(2, 20);

    await store.untrack(1);
    expect(store.getPending()).toEqual([{ videoId: 2, startedAtMs: 20 }]);
  });

  it("변경 시 구독자에게 통지하고, 해지하면 더 이상 부르지 않는다", async () => {
    const store = storeOn();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    await store.track(1, 10);
    expect(listener).toHaveBeenCalledTimes(1);

    await store.untrack(1);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    await store.track(2, 20);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("스냅숏은 변화가 없으면 같은 참조다 — useSyncExternalStore 무한 렌더 방지", async () => {
    const store = storeOn();
    const first = store.getPending();
    expect(store.getPending()).toBe(first);

    await store.track(1, 10);
    const second = store.getPending();
    expect(second).not.toBe(first);
    expect(store.getPending()).toBe(second);
  });

  it("이미 없는 항목의 untrack은 통지하지 않는다 — 워처 정리 경로의 중복 호출 방어", async () => {
    const store = storeOn();
    const listener = vi.fn();
    store.subscribe(listener);

    await store.untrack(999);
    expect(listener).not.toHaveBeenCalled();
  });
});
