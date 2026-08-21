import { describe, expect, it } from "vitest";
import {
  MAX_PENDING_VIDEOS,
  PENDING_VIDEO_STORAGE_KEY,
  addPendingVideo,
  createPendingVideoStorage,
  parsePendingVideos,
  removePendingVideo,
  type PendingVideo,
} from "./pending-video-storage";
import type { KeyValueStorage } from "./upload-flow-storage";

/** 인메모리 가짜 저장소 — 네이티브 AsyncStorage 없이 어댑터 계약만 관찰한다 */
const fakeStorage = (initial?: string) => {
  const cell = { value: initial ?? null } as { value: string | null };
  const storage: KeyValueStorage = {
    getItem: async (key) =>
      key === PENDING_VIDEO_STORAGE_KEY ? cell.value : null,
    setItem: async (key, value) => {
      if (key === PENDING_VIDEO_STORAGE_KEY) cell.value = value;
    },
    removeItem: async (key) => {
      if (key === PENDING_VIDEO_STORAGE_KEY) cell.value = null;
    },
  };
  return { storage, cell };
};

const entry = (videoId: number, startedAtMs = 1_000): PendingVideo => ({
  videoId,
  startedAtMs,
});

describe("parsePendingVideos — 저장값 형상 검증 (기준 8)", () => {
  it("정상 배열을 그대로 읽는다", () => {
    expect(parsePendingVideos(JSON.stringify([entry(1), entry(2, 5)]))).toEqual(
      [entry(1), entry(2, 5)],
    );
  });

  it("값이 없으면 빈 목록이다", () => {
    expect(parsePendingVideos(null)).toEqual([]);
  });

  it("JSON이 깨졌으면 빈 목록으로 폴백한다", () => {
    expect(parsePendingVideos("{not json")).toEqual([]);
  });

  it("배열이 아니거나 항목 형상이 어긋나면 빈 목록으로 폴백한다", () => {
    expect(parsePendingVideos(JSON.stringify({ videoId: 1 }))).toEqual([]);
    expect(parsePendingVideos(JSON.stringify([{ videoId: "1" }]))).toEqual([]);
    expect(
      parsePendingVideos(JSON.stringify([{ videoId: 1, startedAtMs: null }])),
    ).toEqual([]);
  });
});

describe("addPendingVideo / removePendingVideo — 순수 목록 연산 (기준 8)", () => {
  it("같은 videoId는 중복되지 않고 새 값으로 갱신된다", () => {
    const next = addPendingVideo([entry(1, 100), entry(2, 200)], entry(1, 999));
    expect(next).toEqual([entry(2, 200), entry(1, 999)]);
  });

  it("원본 배열을 변형하지 않는다", () => {
    const original = [entry(1)];
    addPendingVideo(original, entry(2));
    expect(original).toEqual([entry(1)]);
  });

  it("remove는 해당 videoId만 걷어낸다 — 없는 id는 무해하다", () => {
    expect(removePendingVideo([entry(1), entry(2)], 1)).toEqual([entry(2)]);
    expect(removePendingVideo([entry(1)], 9)).toEqual([entry(1)]);
  });
});

describe("createPendingVideoStorage — 영속 어댑터 (기준 8)", () => {
  it("add한 항목을 다음 list에서 읽는다 (앱 재시작 대응)", async () => {
    const { storage, cell } = fakeStorage();
    const pending = createPendingVideoStorage(storage);

    await pending.add(entry(7, 42));
    expect(await pending.list()).toEqual([entry(7, 42)]);

    // 같은 저장 셀에서 새 어댑터를 만들어도 값이 살아 있다 = 재시작 후 복원
    expect(await createPendingVideoStorage(storage).list()).toEqual([
      entry(7, 42),
    ]);
    expect(cell.value).not.toBeNull();
  });

  it("remove 후에는 목록에서 사라진다", async () => {
    const { storage } = fakeStorage();
    const pending = createPendingVideoStorage(storage);
    await pending.add(entry(1));
    await pending.add(entry(2));

    expect(await pending.remove(1)).toEqual([entry(2)]);
    expect(await pending.list()).toEqual([entry(2)]);
  });

  it("손상된 저장값은 빈 목록으로 폴백한다 — 크래시하지 않는다", async () => {
    const { storage } = fakeStorage("<<깨진 값>>");
    expect(await createPendingVideoStorage(storage).list()).toEqual([]);
  });

  it("상한을 넘으면 오래된 항목부터 버린다 (R7 병적 성장 방어)", async () => {
    const { storage } = fakeStorage();
    const pending = createPendingVideoStorage(storage);
    for (let id = 1; id <= MAX_PENDING_VIDEOS + 3; id += 1) {
      await pending.add(entry(id));
    }
    const list = await pending.list();
    expect(list).toHaveLength(MAX_PENDING_VIDEOS);
    expect(list[0]).toEqual(entry(4));
    expect(list.at(-1)).toEqual(entry(MAX_PENDING_VIDEOS + 3));
  });

  it("저장소 접근이 실패해도 던지지 않는다 — 총함수 계약", async () => {
    const broken: KeyValueStorage = {
      getItem: async () => {
        throw new Error("storage down");
      },
      setItem: async () => {
        throw new Error("storage down");
      },
      removeItem: async () => {
        throw new Error("storage down");
      },
    };
    const pending = createPendingVideoStorage(broken);
    await expect(pending.list()).resolves.toEqual([]);
    await expect(pending.add(entry(1))).resolves.toEqual([entry(1)]);
    await expect(pending.remove(1)).resolves.toEqual([]);
  });
});
