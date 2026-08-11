import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * getFFmpeg 재시도 회귀 (리뷰 반영) — 최초 로드 실패(rejected promise)가 싱글턴 캐시에
 * 영구히 남으면 PreviewStep [다시 시도]가 새로고침 전까지 항상 즉시 실패한다.
 * wasm 실행 자체는 목킹한다 — 여기서 검증하는 건 캐시 수명 계약뿐이다.
 */
const loadMock = vi.hoisted(() => vi.fn<() => Promise<void>>());

vi.mock("@ffmpeg/ffmpeg", () => ({
  FFmpeg: class {
    load = loadMock;
  },
}));
vi.mock("@ffmpeg/core?url", () => ({ default: "core-url" }));
vi.mock("@ffmpeg/core/wasm?url", () => ({ default: "wasm-url" }));

describe("getFFmpeg — 로드 실패 캐시 오염 방지", () => {
  beforeEach(() => {
    vi.resetModules();
    loadMock.mockReset();
  });

  it("최초 로드가 실패해도 재호출이 다시 로드를 시도한다 (다시 시도 동선)", async () => {
    loadMock.mockRejectedValueOnce(new Error("network"));
    loadMock.mockResolvedValue(undefined);
    const { getFFmpeg } = await import("./ffmpeg-trim");

    await expect(getFFmpeg()).rejects.toThrow("network");
    await expect(getFFmpeg()).resolves.toBeTruthy();
    expect(loadMock).toHaveBeenCalledTimes(2);
  });

  it("성공한 인스턴스는 캐시된다 — 로드는 1회만", async () => {
    loadMock.mockResolvedValue(undefined);
    const { getFFmpeg } = await import("./ffmpeg-trim");

    await getFFmpeg();
    await getFFmpeg();
    expect(loadMock).toHaveBeenCalledTimes(1);
  });
});
