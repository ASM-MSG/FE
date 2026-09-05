import { describe, expect, it } from "vitest";
import {
  createUploadFlowStorage,
  UPLOAD_FLOW_STORAGE_KEY,
  type KeyValueStorage,
} from "./upload-flow-storage";
import { createUploadFlowStore } from "./upload-flow-store";

/**
 * 기준 36·37·39: 업로드 진행 상태의 기기 로컬 영속.
 * 네이티브 모듈(AsyncStorage)은 포트로 주입받는다 — 모델에 직접 들여오면 순수 모델
 * 테스트가 불가능해진다(token-storage의 AuthPersistence 선례). 세 함수 모두 총함수로,
 * 저장소 접근 실패를 화면이 각자 방어하지 않는다(onboarding-storage 계약).
 */
const memoryStorage = (initial: string | null = null) => {
  let value = initial;
  const storage: KeyValueStorage = {
    getItem: async () => value,
    setItem: async (_key, next) => {
      value = next;
    },
    removeItem: async () => {
      value = null;
    },
  };
  return { storage, read: () => value };
};

const failingStorage: KeyValueStorage = {
  getItem: async () => {
    throw new Error("저장소 접근 실패");
  },
  setItem: async () => {
    throw new Error("저장소 접근 실패");
  },
  removeItem: async () => {
    throw new Error("저장소 접근 실패");
  },
};

const persistedSnapshot = () => {
  const store = createUploadFlowStore();
  store.startAnalysis({
    uri: "file:///clip.mp4",
    durationSec: 42,
    fileName: "clip.mp4",
    fileSize: 1024,
    mimeType: "video/mp4",
  });
  store.completeAnalysis([[3, 8]]);
  return store.toPersisted();
};

describe("upload-flow-storage — 진행 상태 영속 (기준 36·39)", () => {
  it("저장한 진행 상태를 그대로 다시 읽는다 — 백그라운드 복귀·콜드 스타트 복원 (기준 36)", async () => {
    const { storage } = memoryStorage();
    const flowStorage = createUploadFlowStorage(storage);
    const snapshot = persistedSnapshot();

    await flowStorage.save(snapshot);

    expect(await flowStorage.load()).toEqual(snapshot);
  });

  it("저장된 값이 없으면 '진행 없음'(null)이다 (기준 36)", async () => {
    const flowStorage = createUploadFlowStorage(memoryStorage().storage);

    expect(await flowStorage.load()).toBeNull();
  });

  it("clear가 영속 값을 제거한다 — 완료 화면 '확인'·플로우 이탈 (기준 39)", async () => {
    const { storage, read } = memoryStorage();
    const flowStorage = createUploadFlowStorage(storage);
    await flowStorage.save(persistedSnapshot());

    await flowStorage.clear();

    expect(read()).toBeNull();
    expect(await flowStorage.load()).toBeNull();
  });

  it("저장 키가 앱 전역에서 고유한 네임스페이스를 쓴다 (기준 36)", async () => {
    const { storage, read } = memoryStorage();
    let usedKey: string | null = null;
    await createUploadFlowStorage({
      ...storage,
      setItem: async (key, value) => {
        usedKey = key;
        await storage.setItem(key, value);
      },
    }).save(persistedSnapshot());

    expect(usedKey).toBe(UPLOAD_FLOW_STORAGE_KEY);
    expect(read()).not.toBeNull();
  });
});

describe("총함수 계약 — 저장소 실패를 밖으로 던지지 않는다 (기준 37)", () => {
  it("읽기 실패는 예외 대신 '진행 없음'으로 폴백한다 (기준 37)", async () => {
    const flowStorage = createUploadFlowStorage(failingStorage);

    await expect(flowStorage.load()).resolves.toBeNull();
  });

  it("쓰기·삭제 실패는 예외를 밖으로 던지지 않는다 (기준 37)", async () => {
    const flowStorage = createUploadFlowStorage(failingStorage);

    await expect(
      flowStorage.save(persistedSnapshot()),
    ).resolves.toBeUndefined();
    await expect(flowStorage.clear()).resolves.toBeUndefined();
  });

  it("깨진 JSON·형상이 어긋난 값도 '진행 없음'으로 폴백한다 (기준 37)", async () => {
    const broken = createUploadFlowStorage(memoryStorage("{not json").storage);
    const wrongShape = createUploadFlowStorage(
      memoryStorage('{"step":"unknown-step"}').storage,
    );

    expect(await broken.load()).toBeNull();
    expect(await wrongShape.load()).toBeNull();
  });
});

/**
 * codex 리뷰 2회차 P1-2: `step`만 알아보면 나머지 필드가 없거나 깨져 있어도 그대로 런타임
 * 상태로 spread돼, 화면이 `suggestions.length` 같은 접근을 하다가 **안전하게 버리는 대신
 * 크래시한다**. 구버전 데이터·부분 기록된 AsyncStorage 값에서 실제로 도달 가능하다.
 * 기준 37("읽기/쓰기 실패는 예외를 던지지 않고 '진행 없음'으로 폴백")의 취지를 반만 지킨
 * 상태였다 — 읽기 실패는 막지만 **읽기 성공 + 내용 불량**은 안 막았다.
 */
describe("형상 검증 — 읽기는 성공했지만 내용이 불량한 값 (기준 37)", () => {
  const loadRaw = async (raw: string) =>
    createUploadFlowStorage(memoryStorage(raw).storage).load();

  /** 정상 스냅숏을 만들어 한 필드만 망가뜨린다 */
  const corrupt = (patch: Record<string, unknown>) =>
    JSON.stringify({ ...persistedSnapshot(), ...patch });

  it("필수 필드가 통째로 빠진 값은 '진행 없음'으로 폴백한다 (기준 37)", async () => {
    expect(await loadRaw('{"step":"preview"}')).toBeNull();
  });

  it("suggestions가 배열이 아니면 폴백한다 — 화면이 .length로 접근하다 크래시한다 (기준 37)", async () => {
    expect(await loadRaw(corrupt({ suggestions: null }))).toBeNull();
    expect(await loadRaw(corrupt({ suggestions: "3개" }))).toBeNull();
  });

  it("추천 원소의 시간이 숫자가 아니면 폴백한다 (기준 37)", async () => {
    expect(
      await loadRaw(
        corrupt({ suggestions: [{ id: "ai-1", start: "3", end: 8 }] }),
      ),
    ).toBeNull();
  });

  it("영상 메타의 타입이 어긋나면 폴백한다 — presign 요청이 깨진 값으로 나간다 (기준 37)", async () => {
    expect(await loadRaw(corrupt({ video: { uri: 42 } }))).toBeNull();
    expect(
      await loadRaw(
        corrupt({
          video: {
            uri: "file:///c.mp4",
            durationSec: 42,
            fileName: "c.mp4",
            fileSize: "1024",
            mimeType: null,
          },
        }),
      ),
    ).toBeNull();
  });

  it("선택 상태의 mode가 알 수 없는 값이면 폴백한다 (기준 37)", async () => {
    expect(
      await loadRaw(
        corrupt({
          selection: {
            mode: "auto",
            selectedAi: null,
            manualSegment: { start: 0, end: 5 },
          },
        }),
      ),
    ).toBeNull();
  });

  it("오케스트레이션 형상이 깨지면 폴백한다 — 재개가 s3Key를 읽다 크래시한다 (기준 37)", async () => {
    expect(await loadRaw(corrupt({ confirm: { s3PutDone: true } }))).toBeNull();
    expect(
      await loadRaw(
        corrupt({ analysis: { presign: { s3Key: "k" }, s3PutDone: false } }),
      ),
    ).toBeNull();
  });

  it("구버전 스토어 형태(MSG-302 selectedSegmentId)는 폴백한다 (기준 37)", async () => {
    expect(
      await loadRaw(
        '{"video":null,"title":"","selectedSegmentId":"segment-1"}',
      ),
    ).toBeNull();
  });

  it("정상 스냅숏은 그대로 복원된다 — 검증이 과하게 버리지 않는다 (기준 36)", async () => {
    const snapshot = persistedSnapshot();

    expect(await loadRaw(JSON.stringify(snapshot))).toEqual(snapshot);
  });
});

/**
 * AC 9 (D11): 저장값 형상 검증에 `eventTarget`(null 또는 4필드)이 포함되고,
 * **필드가 없는 구버전 저장값은 버리지 않고 null로 정규화**한다 — 진행 중인 업로드를
 * 앱 업데이트가 삼키지 않게 한다.
 */
const eventTarget = {
  occurrenceId: 5,
  locationId: 11,
  occurrenceTitle: "서면 목데이터 축제",
  locationName: "서면 목데이터 포토존",
};

describe("upload-flow-storage — 행사 업로드 대상 영속 (AC 9·D11)", () => {
  it("행사 대상이 실린 스냅숏을 그대로 다시 읽는다", async () => {
    const { storage } = memoryStorage();
    const flowStorage = createUploadFlowStorage(storage);
    const store = createUploadFlowStore();
    store.setEventTarget(eventTarget);
    store.startAnalysis({
      uri: "file:///clip.mp4",
      durationSec: 42,
      fileName: "clip.mp4",
      fileSize: 1024,
      mimeType: "video/mp4",
    });

    await flowStorage.save(store.toPersisted());

    expect((await flowStorage.load())?.eventTarget).toEqual(eventTarget);
  });

  it("eventTarget 필드가 없는 구버전 저장값은 null로 정규화해 통과시킨다", async () => {
    const { eventTarget: _drop, ...legacy } = persistedSnapshot();
    const { storage } = memoryStorage(JSON.stringify(legacy));

    const loaded = await createUploadFlowStorage(storage).load();

    expect(loaded).not.toBeNull();
    expect(loaded?.eventTarget).toBeNull();
    expect(loaded?.step).toBe(legacy.step);
  });

  it("형상이 깨진 eventTarget은 진행 없음으로 폴백한다", async () => {
    const broken = {
      ...persistedSnapshot(),
      eventTarget: { occurrenceId: 5, locationId: 11 },
    };
    const { storage } = memoryStorage(JSON.stringify(broken));

    expect(await createUploadFlowStorage(storage).load()).toBeNull();
  });
});

/**
 * MSG-572 (D3): 저장값 형상 검증에 `visibility`가 포함된다 — `eventTarget`(MSG-560 D11) 패턴
 * 미러. **필드가 없는 구버전 저장값은 PUBLIC으로 정규화**해 통과시키고, 있는데 UI에 없는 값
 * (`FRIENDS`·숫자)은 진행 없음으로 폴백한다 — 통과시키면 ✓ 없는 라디오가 뜬다.
 */
describe("upload-flow-storage — 공개 범위 영속 (MSG-572 AC 5·6)", () => {
  it("나만 보기 선택이 실린 스냅숏을 저장→읽기 왕복해도 값이 보존된다 (AC 5)", async () => {
    const { storage } = memoryStorage();
    const flowStorage = createUploadFlowStorage(storage);
    const snapshot = { ...persistedSnapshot(), visibility: "PRIVATE" as const };

    await flowStorage.save(snapshot);

    expect((await flowStorage.load())?.visibility).toBe("PRIVATE");
  });

  it("visibility 필드가 없는 구버전 저장값은 PUBLIC으로 정규화해 통과시킨다 (AC 6)", async () => {
    const { visibility: _drop, ...legacy } = persistedSnapshot();
    const { storage } = memoryStorage(JSON.stringify(legacy));

    const loaded = await createUploadFlowStorage(storage).load();

    expect(loaded).not.toBeNull();
    expect(loaded?.visibility).toBe("PUBLIC");
    expect(loaded?.step).toBe(legacy.step);
  });

  it("UI에 없는 값(FRIENDS)·타입이 어긋난 값(숫자)은 진행 없음으로 폴백한다 (AC 6)", async () => {
    const friends = createUploadFlowStorage(
      memoryStorage(
        JSON.stringify({ ...persistedSnapshot(), visibility: "FRIENDS" }),
      ).storage,
    );
    const numeric = createUploadFlowStorage(
      memoryStorage(JSON.stringify({ ...persistedSnapshot(), visibility: 1 }))
        .storage,
    );

    expect(await friends.load()).toBeNull();
    expect(await numeric.load()).toBeNull();
  });
});
