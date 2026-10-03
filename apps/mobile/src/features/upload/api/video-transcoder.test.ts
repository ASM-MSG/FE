import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * 템플릿 ① 순수 로직(경계 계약) — 네이티브 변환 모듈 격리 경계 (AC 5, D4·D6).
 *
 * kakao-adapter.test 미러. `react-native-compressor`는 nitro 네이티브 모듈이라 vitest(node)에서
 * 파싱조차 되지 않고, 모듈이 빠진 구 dev client에서는 접근 자체가 던진다. 이 테스트 러너가 곧
 * "모듈 미탑재 환경"이므로 ① 정적 import가 없다는 것과 ② 그 환경에서 변환이 **조용히 null**
 * (원본 fallback)로 끝난다는 것을 한 번에 고정한다.
 */

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("video-transcoder (AC 5, D6)", () => {
  it("모듈을 import하는 것만으로는 네이티브 변환 모듈을 로드하지 않는다", async () => {
    // 정적 import였다면 이 한 줄이 react-native 해석 실패로 던진다
    await expect(import("./video-transcoder")).resolves.toHaveProperty(
      "transcodeVideo",
    );
  });

  it("네이티브 모듈을 로드할 수 없으면(구 dev client) 던지지 않고 null을 돌려준다 — 원본으로 선분석 진행", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { transcodeVideo } = await import("./video-transcoder");
    const onProgress = vi.fn();

    const outcome = await transcodeVideo(
      {
        uri: "file:///clip.mov",
        durationSec: 30,
        fileName: "clip.mov",
        fileSize: 1024,
        mimeType: "video/quicktime",
        transcoded: false,
      },
      onProgress,
    );

    expect(outcome).toBeNull();
    expect(onProgress).not.toHaveBeenCalled();
  });
});
