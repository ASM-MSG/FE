import { describe, expect, it } from "vitest";
import {
  shouldTranscode,
  toTranscodedVideo,
  transcodeMaxSize,
  TRANSCODE_TIMEOUT_MS,
} from "./transcode-policy";
import type { UploadVideo } from "./upload-flow-store";

/**
 * 템플릿 ① 순수 로직 — MSG-616 업로드 전 720p H.264/AAC 변환의 판정·조립 (AC 1·7, D2·D5).
 * 네이티브 호출은 `api/video-transcoder.ts`가 하고, 여기는 "변환할까"·"어느 크기로"·
 * "결과를 스토어 `video`로 어떻게 바꾸나"만 순수 함수로 고정한다.
 */
const original: UploadVideo = {
  uri: "content://media/external/video/42",
  durationSec: 31,
  fileName: "PXL_20261003.mov",
  fileSize: 98 * 1024 * 1024,
  mimeType: "video/quicktime",
  transcoded: false,
};

describe("shouldTranscode — 재진입 시 변환 여부 판정 (AC 7, D5)", () => {
  it("picker 결과(transcoded:false)는 변환 대상이다", () => {
    expect(shouldTranscode(original)).toBe(true);
  });

  it("이미 변환된 영상(transcoded:true)은 건너뛰고 선분석으로 간다 — 재변환은 화질 손실", () => {
    expect(shouldTranscode({ ...original, transcoded: true })).toBe(false);
  });
});

describe("transcodeMaxSize — 출력 height 720에 맞춘 긴 변 상한 (D2)", () => {
  it("가로 영상(1920×1080)은 긴 변 1280 → 1280×720", () => {
    expect(transcodeMaxSize(1920, 1080)).toBe(1280);
  });

  it("세로 영상(1080×1920, 회전 반영값)은 긴 변 720 → 406×720 — BE 게이트 height ≤720", () => {
    expect(transcodeMaxSize(1080, 1920)).toBe(720);
  });

  it("정방형은 세로 취급 — height가 720을 넘지 않아야 한다", () => {
    expect(transcodeMaxSize(1080, 1080)).toBe(720);
  });
});

describe("toTranscodedVideo — 변환본으로 스토어 video 교체값 조립 (AC 1)", () => {
  it("uri·video/mp4·.mp4 파일명·변환본 bytes·길이(초 반올림)·transcoded:true로 바뀐다", () => {
    const video = toTranscodedVideo(original, {
      uri: "file:///data/user/0/kr.fillmap.app/cache/abc.mp4",
      width: 406,
      height: 720,
      size: 7_340_032,
      duration: 30.6,
    });

    expect(video).toEqual({
      uri: "file:///data/user/0/kr.fillmap.app/cache/abc.mp4",
      durationSec: 31,
      fileName: "PXL_20261003.mp4",
      fileSize: 7_340_032,
      mimeType: "video/mp4",
      transcoded: true,
    });
  });

  it("확장자 없는 파일명(안드로이드 content:// 파생)에도 .mp4를 붙인다", () => {
    expect(
      toTranscodedVideo(
        { ...original, fileName: "video" },
        {
          uri: "file:///c.mp4",
          width: 1280,
          height: 720,
          size: 1,
          duration: 5,
        },
      ).fileName,
    ).toBe("video.mp4");
  });
});

describe("TRANSCODE_TIMEOUT_MS — 뒤로가기 없는 화면에 갇히지 않는 상한 (D4)", () => {
  it("120초다 — 180초 상한 영상 예상 변환(~60초)의 2배 여유", () => {
    expect(TRANSCODE_TIMEOUT_MS).toBe(120_000);
  });
});
