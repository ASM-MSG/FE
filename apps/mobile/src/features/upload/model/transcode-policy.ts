import type { UploadVideo } from "./upload-flow-store";

/**
 * 업로드 전 720p H.264/AAC 변환의 판정·조립 순수 함수 (MSG-616 D2·D4·D5·D7).
 *
 * 네이티브 호출(`react-native-compressor`)은 `api/video-transcoder.ts`에 가둔다 — 여기는
 * "변환할까"·"어느 크기로"·"결과를 스토어 `video`로 어떻게 바꾸나"만 담아 vitest로 고정한다.
 *
 * 목적은 BE 짝 티켓 MSG-615의 remux 게이트(**비디오 h264 && 코딩 height ≤720 && 오디오
 * aac/무음**)를 통과하는 파일을 만드는 것이다. 통과하면 서버가 재인코딩 없이 `-c copy`로
 * 끝내(<3s), 실패하면 기존 인코딩 경로로 떨어질 뿐이라 **변환 실패는 사용자에게 보이지 않는다**.
 */

/** 네이티브 변환 결과 — 출력 파일의 메타(`getVideoMetaData`)까지 확보한 뒤의 값 */
export interface TranscodeOutcome {
  /** `file://…/<uuid>.mp4` — Android cacheDir / iOS NSTemporaryDirectory */
  uri: string;
  width: number;
  height: number;
  /** bytes */
  size: number;
  /** seconds */
  duration: number;
}

/**
 * 변환 상한(ms) — 네이티브가 멈추면 뒤로가기 없는 분석 화면에 갇히므로 반드시 끝을 둔다.
 * 180초 상한 영상의 예상 변환(~60초) 대비 2배 여유(스펙 추정 A).
 */
export const TRANSCODE_TIMEOUT_MS = 120_000;

/** 재진입 판정 — 변환본을 다시 변환하면 화질 손실 + 시간 낭비. 실패 후 재개의 재시도는 허용 */
export const shouldTranscode = (video: UploadVideo): boolean =>
  !video.transcoded;

/**
 * 라이브러리 `maxSize`는 **긴 변** 상한이다. BE 현행 인코딩(`scale=-2:720`)·remux 게이트는
 * 모두 **코딩 height** 기준이라 세로 영상을 "진짜 720p"(720×1280)로 만들면 height 1280으로
 * 게이트에서 탈락해 서버가 다시 406×720으로 인코딩한다 — 티켓 목적이 무너진다.
 * 그래서 가로는 1280(→1280×720), 세로·정방형은 720(→406×720 = 지금 서버가 모든 세로 업로드에
 * 내보내는 것과 같은 결과물)으로 환산한다. 입력은 회전이 반영된 표시 폭·높이다.
 */
export const transcodeMaxSize = (width: number, height: number): number =>
  width > height ? 1280 : 720;

/** 원본 파일명의 확장자를 `.mp4`로 — presign `extension` 판정 재료라 컨테이너와 맞아야 한다 */
const toMp4FileName = (fileName: string): string => {
  const dot = fileName.lastIndexOf(".");
  return `${dot > 0 ? fileName.slice(0, dot) : fileName}.mp4`;
};

/**
 * 변환본으로 스토어 `video`를 교체할 값 (AC 1). `fileSize`·`mimeType`이 그대로 presign
 * `contentLength`·`contentType`·S3 PUT 헤더로 흘러가므로 원본 값이 어디에도 남지 않는다(AC 3).
 * `durationSec`은 picker와 같은 규칙(초 반올림)이라 길이 뱃지·추천 범위 계산이 일관된다.
 */
export const toTranscodedVideo = (
  original: UploadVideo,
  outcome: TranscodeOutcome,
): UploadVideo => ({
  uri: outcome.uri,
  durationSec: Math.round(outcome.duration),
  fileName: toMp4FileName(original.fileName),
  fileSize: outcome.size,
  mimeType: "video/mp4",
  transcoded: true,
});
