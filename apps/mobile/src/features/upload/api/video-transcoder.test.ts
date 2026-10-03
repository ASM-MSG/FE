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

/**
 * 클로드 리뷰(PR #173) — 네이티브 경계의 **취소·검증 계약**. 실제 모듈은 vitest에서 파싱되지 않으므로
 * `vi.doMock`으로 같은 이름의 가짜를 세운다(네이티브 경계는 네트워크처럼 "경계에서 한 번만 mock"의
 * 대상이다 — 내부 헬퍼 감시가 아니라 라이브러리 API 호출 계약을 단정한다).
 */
const sampleVideo = {
  uri: "file:///clip.mov",
  durationSec: 30,
  fileName: "clip.mov",
  fileSize: 1024,
  mimeType: "video/quicktime",
  transcoded: false,
};

const mockCompressor = () => {
  const compress = vi.fn();
  const cancelCompression = vi.fn();
  const getVideoMetaData = vi.fn();
  vi.doMock("react-native-compressor", () => ({
    Video: { compress, cancelCompression },
    getVideoMetaData,
  }));
  return { compress, cancelCompression, getVideoMetaData };
};

describe("video-transcoder — 취소·출력 검증 (클로드 리뷰 #173)", () => {
  afterEach(() => {
    vi.doUnmock("react-native-compressor");
  });

  it("signal이 abort되면 진행 중 압축을 cancelCompression으로 취소하고 null을 돌려준다 — 출력 메타 조회·후속 흐름 없음", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { compress, cancelCompression, getVideoMetaData } = mockCompressor();
    let release!: (uri: string) => void;
    compress.mockImplementation(
      (_uri: string, options: { getCancellationId: (id: string) => void }) => {
        options.getCancellationId("cancel-1");
        return new Promise<string>((resolve) => {
          release = resolve;
        });
      },
    );
    const { transcodeVideo } = await import("./video-transcoder");
    const controller = new AbortController();

    const pending = transcodeVideo(sampleVideo, vi.fn(), controller.signal);
    await vi.waitFor(() => expect(compress).toHaveBeenCalledTimes(1));
    controller.abort();
    // 네이티브가 취소 뒤 settle되는 경우를 흉내 — 그래도 결과는 null이어야 한다
    release("file:///cache/out.mp4");

    expect(cancelCompression).toHaveBeenCalledWith("cancel-1");
    await expect(pending).resolves.toBeNull();
    expect(getVideoMetaData).not.toHaveBeenCalled();
  });

  it("출력 메타의 duration이 유한한 양수가 아니면 null — 원본으로 fallback (durationSec NaN 차단)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { compress, getVideoMetaData } = mockCompressor();
    compress.mockResolvedValue("file:///cache/out.mp4");
    getVideoMetaData.mockResolvedValue({
      size: 4_563_142,
      duration: Number.NaN,
      width: 404,
      height: 720,
      extension: "mp4",
    });
    const { transcodeVideo } = await import("./video-transcoder");

    await expect(transcodeVideo(sampleVideo, vi.fn())).resolves.toBeNull();
  });
});
