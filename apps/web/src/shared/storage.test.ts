import { beforeEach, describe, expect, it } from "vitest";
import { pendingVideoStorage } from "./storage";

/**
 * 처리 대기 영상 보관소 (MSG-329 B15) — 확정 후 블러 처리 대기 videoId를 localStorage에
 * 기록해 앱 재진입·탭 포커스 복귀 시 상태를 조회한다. 기존 어댑터(webStorage 등)는
 * 사용처 테스트가 커버하므로 여기서는 신설 pendingVideoStorage만 단정한다.
 */
beforeEach(() => {
  localStorage.clear();
});

describe("pendingVideoStorage — 처리 대기 videoId 기록 (B15)", () => {
  it("추가한 항목이 videoId·시작 시각과 함께 조회된다", () => {
    pendingVideoStorage.add({ videoId: 7, startedAtMs: 1_000 });

    expect(pendingVideoStorage.list()).toEqual([
      { videoId: 7, startedAtMs: 1_000 },
    ]);
  });

  it("여러 항목을 보관하고, 같은 videoId 재추가는 갱신이다(중복 없음)", () => {
    pendingVideoStorage.add({ videoId: 7, startedAtMs: 1_000 });
    pendingVideoStorage.add({ videoId: 8, startedAtMs: 2_000 });
    pendingVideoStorage.add({ videoId: 7, startedAtMs: 3_000 });

    const list = pendingVideoStorage.list();
    expect(list).toHaveLength(2);
    expect(list.find((v) => v.videoId === 7)?.startedAtMs).toBe(3_000);
  });

  it("READY/FAILED/만료 처리 후 remove로 목록에서 제거된다", () => {
    pendingVideoStorage.add({ videoId: 7, startedAtMs: 1_000 });
    pendingVideoStorage.add({ videoId: 8, startedAtMs: 2_000 });

    pendingVideoStorage.remove(7);

    expect(pendingVideoStorage.list()).toEqual([
      { videoId: 8, startedAtMs: 2_000 },
    ]);
  });

  it("저장값이 손상돼도(파싱 불가·형상 위반) 빈 목록으로 폴백한다", () => {
    localStorage.setItem("fillmap.upload.pending:v1", "not-json{");
    expect(pendingVideoStorage.list()).toEqual([]);

    localStorage.setItem(
      "fillmap.upload.pending:v1",
      JSON.stringify([{ videoId: "칠" }]),
    );
    expect(pendingVideoStorage.list()).toEqual([]);
  });
});
