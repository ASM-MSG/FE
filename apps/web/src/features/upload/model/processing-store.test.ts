import { beforeEach, describe, expect, it } from "vitest";
import { pendingVideoStorage } from "@/shared/storage";
import { useProcessingStore } from "./processing-store";

/**
 * 처리 대기 스토어 (B15) — pendingVideoStorage(localStorage 어댑터)를 정본으로 미러링해
 * 같은 탭의 확정(track)과 워처 구독을 잇는다. 재진입 시 hydrate로 복원한다.
 */
beforeEach(() => {
  // model 레이어는 localStorage 직접 접근 금지(RN 경계) — 어댑터로 잔존 항목을 비운다
  for (const item of pendingVideoStorage.list()) {
    pendingVideoStorage.remove(item.videoId);
  }
  useProcessingStore.setState({ pending: [] });
});

describe("useProcessingStore — 처리 대기 목록 (B15)", () => {
  it("track은 스토리지에 기록하고 상태에도 반영한다 — 확정 성공 직후 호출된다", () => {
    useProcessingStore.getState().track(7, 1_000);

    expect(useProcessingStore.getState().pending).toEqual([
      { videoId: 7, startedAtMs: 1_000 },
    ]);
    expect(pendingVideoStorage.list()).toEqual([
      { videoId: 7, startedAtMs: 1_000 },
    ]);
  });

  it("hydrate는 스토리지의 대기 목록을 상태로 복원한다 — 앱 재진입 커버", () => {
    pendingVideoStorage.add({ videoId: 9, startedAtMs: 5_000 });

    useProcessingStore.getState().hydrate();

    expect(useProcessingStore.getState().pending).toEqual([
      { videoId: 9, startedAtMs: 5_000 },
    ]);
  });

  it("untrack은 READY/FAILED/만료 처리된 항목을 상태·스토리지 모두에서 제거한다", () => {
    useProcessingStore.getState().track(7, 1_000);
    useProcessingStore.getState().track(8, 2_000);

    useProcessingStore.getState().untrack(7);

    expect(useProcessingStore.getState().pending).toEqual([
      { videoId: 8, startedAtMs: 2_000 },
    ]);
    expect(pendingVideoStorage.list()).toEqual([
      { videoId: 8, startedAtMs: 2_000 },
    ]);
  });
});
