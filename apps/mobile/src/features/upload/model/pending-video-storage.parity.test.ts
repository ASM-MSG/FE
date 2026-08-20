import { beforeEach, describe, expect, it } from "vitest";
import {
  addPendingVideo,
  parsePendingVideos,
  removePendingVideo,
  type PendingVideo,
} from "./pending-video-storage";

/**
 * 기준 8: 처리 대기 목록의 **목록 연산·형상 검증 의미**를 웹 MSG-329 원본
 * (`apps/web/src/shared/storage.ts`의 `pendingVideoStorage`)과 동등하게 유지한다.
 *
 * 웹 원본은 localStorage에 직접 붙어 있어 함수를 그대로 가져올 수 없다 — 여기서는
 * **인메모리 localStorage 스텁을 심고** 웹 구현을 구동해, 같은 입력에 같은 목록이
 * 나오는지를 값으로 고정한다(웹 원본 동적 import 관례는 upload-wizard.parity.test.ts 주석).
 *
 * **의도적 편차 1건**: 모바일은 저장 항목 상한(MAX_PENDING_VIDEOS)을 둔다(스펙 R7).
 * 상한은 순수 연산이 아니라 어댑터(`createPendingVideoStorage`) 층에 있으므로 아래
 * 순수 함수 동등성에는 영향이 없다 — 상한 동작은 pending-video-storage.test.ts가 잡는다.
 */
interface WebStorageModule {
  pendingVideoStorage: {
    list: () => PendingVideo[];
    add: (entry: PendingVideo) => void;
    remove: (videoId: number) => void;
  };
}

const WEB_STORAGE_PATH = new URL(
  "../../../../../web/src/shared/storage.ts",
  import.meta.url,
).pathname;

const installLocalStorageStub = () => {
  const cells = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => cells.get(key) ?? null,
      setItem: (key: string, value: string) => {
        cells.set(key, value);
      },
      removeItem: (key: string) => {
        cells.delete(key);
      },
      clear: () => {
        cells.clear();
      },
    },
  });
  return cells;
};

const loadWebStorage = async (): Promise<WebStorageModule> => {
  installLocalStorageStub();
  return (await import(WEB_STORAGE_PATH)) as WebStorageModule;
};

const entry = (videoId: number, startedAtMs: number): PendingVideo => ({
  videoId,
  startedAtMs,
});

/** 모바일 순수 연산으로 같은 시나리오를 재생해 목록을 얻는다 */
const replayOnMobile = (
  steps: ({ add: PendingVideo } | { remove: number })[],
): PendingVideo[] =>
  steps.reduce<PendingVideo[]>(
    (list, step) =>
      "add" in step
        ? addPendingVideo(list, step.add)
        : removePendingVideo(list, step.remove),
    [],
  );

describe("처리 대기 목록 — 웹 pendingVideoStorage 동등성", () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
  });

  it("추가·중복 갱신·제거 시나리오에서 같은 목록을 만든다", async () => {
    const { pendingVideoStorage } = await loadWebStorage();
    const steps = [
      { add: entry(1, 100) },
      { add: entry(2, 200) },
      { add: entry(1, 999) },
      { remove: 2 },
      { add: entry(3, 300) },
      { remove: 42 },
    ] as ({ add: PendingVideo } | { remove: number })[];

    for (const step of steps) {
      if ("add" in step) pendingVideoStorage.add(step.add);
      else pendingVideoStorage.remove(step.remove);
    }

    expect(replayOnMobile(steps)).toEqual(pendingVideoStorage.list());
  });

  it("손상·형상 불일치 저장값을 양쪽 모두 빈 목록으로 폴백한다", async () => {
    const { pendingVideoStorage } = await loadWebStorage();
    const corrupted = [
      "{not json",
      JSON.stringify({ videoId: 1, startedAtMs: 1 }),
      JSON.stringify([{ videoId: "1", startedAtMs: 1 }]),
      JSON.stringify([{ videoId: 1 }]),
    ];

    for (const raw of corrupted) {
      globalThis.localStorage.setItem("fillmap.upload.pending:v1", raw);
      expect(parsePendingVideos(raw)).toEqual(pendingVideoStorage.list());
      expect(parsePendingVideos(raw)).toEqual([]);
    }
  });
});
